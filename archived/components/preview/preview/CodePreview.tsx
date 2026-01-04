'use client';

import React, { useState, useEffect } from 'react';
import { detectCodeType } from '@/lib/code-type-detector';
import PrismaPreview from './PrismaPreview';
import SQLPreview from './SQLPreview';
import ShopifyAppPreview from './ShopifyAppPreview';
import ShopifyMerchantPreview from '@/components/ShopifyMerchantPreview';
import ShopifyDeveloperPreview from '@/components/ShopifyDeveloperPreview';
import ApiPreview from './ApiPreview';
import ChromeExtensionPreview from './ChromeExtensionPreview';
import { useAuth } from '@/contexts/AuthContext';

interface CodePreviewProps {
  code: string;
  filename?: string;
  files?: Array<{ path: string; content: string }>;
  deployment?: any; // Shopify deployment data
  forceMerchantView?: boolean; // Force merchant view regardless of code type
  shopifyViewMode?: 'merchant' | 'developer' | null; // Pass view mode from parent
}

export default function CodePreview({ code, filename, files, deployment, forceMerchantView, shopifyViewMode: parentViewMode }: CodePreviewProps) {
  const { session } = useAuth();
  const [viewMode, setViewMode] = useState<'merchant' | 'developer'>('merchant');
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const codeType = detectCodeType(code, filename);

  console.log('[CodePreview] Debug:', {
    codeType: codeType.type,
    hasDeployment: !!deployment,
    forceMerchantView,
    parentViewMode,
    viewMode,
  });

  // Load user preferences for Shopify apps
  useEffect(() => {
    // Use parent view mode if provided, otherwise load from API
    if (parentViewMode) {
      setViewMode(parentViewMode);
      setLoadingPrefs(false);
      console.log('[CodePreview] Using parent view mode:', parentViewMode);
      return;
    }

    // Check if this is Shopify-related (app, deployment, or database part of Shopify)
    const isShopifyRelated = codeType.type === 'SHOPIFY_APP' || 
                             deployment !== null || 
                             code.includes('shopify') || 
                             code.includes('Shopify');
    
    if (isShopifyRelated && session) {
      const loadPreferences = async () => {
        try {
          const response = await fetch('/api/user/preferences', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          if (response.ok) {
            const { preferences } = await response.json();
            console.log('[CodePreview] Loaded preferences:', preferences);
            if (preferences?.shopify_view_mode) {
              setViewMode(preferences.shopify_view_mode);
            }
          }
        } catch (error) {
          console.error('Error loading preferences:', error);
        } finally {
          setLoadingPrefs(false);
        }
      };
      loadPreferences();
    } else {
      setLoadingPrefs(false);
    }
  }, [codeType.type, session, deployment, parentViewMode]);

  const handleToggleView = async () => {
    const newMode = viewMode === 'merchant' ? 'developer' : 'merchant';
    setViewMode(newMode);

    // Save preference
    if (session) {
      try {
        await fetch('/api/user/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            shopify_view_mode: newMode,
          }),
        });
      } catch (error) {
        console.error('Error saving preference:', error);
      }
    }
  };

  // CRITICAL: If forceMerchantView is true, show merchant preview regardless of code type
  if (forceMerchantView && deployment) {
    console.log('[CodePreview] Force merchant view - showing merchant preview');
    return (
      <ShopifyMerchantPreview
        deployment={deployment}
        onToggleView={handleToggleView}
      />
    );
  }

  // Route to appropriate preview panel
  switch (codeType.type) {
    case 'DATABASE':
      // If this is a database schema but we have a Shopify deployment and merchant mode,
      // show merchant preview instead of technical Prisma preview
      if (deployment && (viewMode === 'merchant' || forceMerchantView)) {
        console.log('[CodePreview] Database detected but merchant mode - showing merchant preview');
        return (
          <ShopifyMerchantPreview
            deployment={deployment}
            onToggleView={handleToggleView}
          />
        );
      }
      
      // For developers or non-Shopify databases, show technical preview
      if (codeType.subtype === 'PRISMA') {
        return <PrismaPreview code={code} />;
      }
      return <SQLPreview code={code} subtype={codeType.subtype as 'SUPABASE' | 'SQL'} />;
    
    case 'SHOPIFY_APP':
      if (loadingPrefs) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Loading...</div>
          </div>
        );
      }

      // If deployment exists, use merchant/developer previews
      if (deployment) {
        if (viewMode === 'merchant') {
          console.log('[CodePreview] Shopify app with deployment - merchant view');
          return (
            <ShopifyMerchantPreview
              deployment={deployment}
              onToggleView={handleToggleView}
            />
          );
        } else {
          console.log('[CodePreview] Shopify app with deployment - developer view');
          return (
            <ShopifyDeveloperPreview
              deployment={deployment}
              files={files}
              onToggleView={handleToggleView}
            />
          );
        }
      }

      // Fallback to technical preview if no deployment
      return <ShopifyAppPreview code={code} files={files} />;
    
    case 'API':
      return <ApiPreview code={code} framework={codeType.framework} files={files} />;
    
    case 'CHROME_EXTENSION':
      return <ChromeExtensionPreview code={code} files={files} />;
    
    case 'BROWSER_PREVIEWABLE':
      // Return null to use default browser preview
      return null;
    
    default:
      // Generic non-browser preview
      return null;
  }
}

