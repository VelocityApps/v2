// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { PreviewPanel, Header, Actions, Button as PreviewButton, LabelValue, TagList, Tag } from './preview/PreviewPanel';
import { extractShopifyFeatures, detectShopifyAppType } from '@/lib/code-analysis';
import { downloadZip } from '@/lib/preview-actions';

interface ShopifyDeveloperPreviewProps {
  deployment: {
    appName: string;
    installUrl: string;
    appUrl: string;
    previewUrl: string;
    code: string;
    features: string[];
    appType?: string;
    databaseUrl?: string;
    shopifyAppId?: string;
  };
  files?: Array<{ path: string; content: string }>;
  onToggleView?: () => void;
}

export default function ShopifyDeveloperPreview({ deployment, files, onToggleView }: ShopifyDeveloperPreviewProps) {
  const [activeTab, setActiveTab] = useState<'structure' | 'schema' | 'files' | 'env'>('structure');

  const handleDownload = () => {
    if (files && files.length > 0) {
      downloadZip(files, 'shopify-app');
    } else {
      const blob = new Blob([deployment.code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shopify-app.zip';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const extractPrismaSchema = (code: string): string => {
    const schemaMatch = code.match(/\/\/ === .*schema\.prisma ===[\s\S]*?(?=\/\/ ===|\n\n\n|$)/);
    return schemaMatch ? schemaMatch[0] : '// No Prisma schema found';
  };

  return (
    <PreviewPanel type="shopify-developer">
      <div className="h-full overflow-y-auto">
        <Header 
          icon="🛍️" 
          title="Shopify App Generated"
        />
        
        <div className="flex items-center gap-2 mb-6">
          <span className="px-3 py-1 bg-green-500/20 text-green-500 text-xs font-medium rounded-full">
            Deployed
          </span>
          <span className="px-3 py-1 bg-blue-500/20 text-blue-500 text-xs font-medium rounded-full">
            Ready to Install
          </span>
        </div>

        {/* Quick Actions */}
        <Actions>
          <PreviewButton
            primary
            onClick={() => window.open(deployment.installUrl, '_blank', 'noopener,noreferrer')}
          >
            Install to Shopify
          </PreviewButton>
          <PreviewButton onClick={handleDownload}>
            Download Code
          </PreviewButton>
        </Actions>

        {/* Technical Details */}
        <div className="mt-6 space-y-6">
          {/* Stack */}
          <div className="bg-[#0a0a0a] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Stack</h3>
            <div className="space-y-2">
              <LabelValue label="Framework" value="Remix + Shopify App Bridge" />
              <LabelValue label="UI Library" value="Shopify Polaris" />
              <LabelValue label="Database" value="PostgreSQL (Prisma ORM)" />
              <LabelValue label="Hosting" value="Fly.io (auto-deployed)" />
            </div>
          </div>

          {/* Deployment Info */}
          <div className="bg-[#0a0a0a] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Deployment Info</h3>
            <div className="space-y-2">
              <div className="label-value">
                <span className="label">App URL:</span>
                <code className="value inline-code">{deployment.appUrl}</code>
              </div>
              <div className="label-value">
                <span className="label">Install URL:</span>
                <code className="value inline-code">{deployment.installUrl}</code>
              </div>
              {deployment.databaseUrl && (
                <div className="label-value">
                  <span className="label">Database:</span>
                  <code className="value inline-code">
                    {deployment.databaseUrl.split('@')[1] || 'Hidden'}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          {deployment.features.length > 0 && (
            <div className="bg-[#0a0a0a] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Features Detected</h3>
              <TagList>
                {deployment.features.map((feature, i) => (
                  <Tag key={i}>{feature}</Tag>
                ))}
              </TagList>
            </div>
          )}
        </div>

        {/* Code Preview Tabs */}
        <div className="mt-6">
          <div className="flex gap-2 border-b border-[#333] mb-4">
            {(['structure', 'schema', 'files', 'env'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-[#0066cc] border-b-2 border-[#0066cc]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-[#0a0a0a] rounded-lg p-4">
            {activeTab === 'schema' && (
              <pre className="code-block text-xs">
                <code>{extractPrismaSchema(deployment.code)}</code>
              </pre>
            )}
            {activeTab === 'files' && files && (
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="text-sm text-gray-300">
                    {file.path}
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'env' && (
              <div className="space-y-2 text-sm">
                <div className="text-gray-300">SHOPIFY_API_KEY=***</div>
                <div className="text-gray-300">SHOPIFY_API_SECRET=***</div>
                <div className="text-gray-300">DATABASE_URL=***</div>
              </div>
            )}
            {activeTab === 'structure' && (
              <div className="text-sm text-gray-400">
                <div>📁 shopify-app/</div>
                <div className="ml-4">📁 app/</div>
                <div className="ml-8">📁 routes/</div>
                <div className="ml-12">📄 app._index.jsx</div>
                <div className="ml-12">📄 auth.$.jsx</div>
                <div className="ml-8">📁 components/</div>
                <div className="ml-4">📄 shopify.app.toml</div>
                <div className="ml-4">📄 package.json</div>
              </div>
            )}
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="mt-6 bg-[#0a0a0a] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Local Development Setup</h3>
          <pre className="code-block text-xs">
            <code>{`# 1. Download and extract code
# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Add your Shopify API credentials

# 4. Set up database
npx prisma migrate dev

# 5. Run development server
npm run dev

# App runs at http://localhost:3000`}</code>
          </pre>
        </div>

        {/* View Mode Toggle */}
        {onToggleView && (
          <div className="mt-6 flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-[#333]">
            <span className="text-sm text-gray-400">View Mode:</span>
            <button
              onClick={onToggleView}
              className="px-4 py-2 bg-[#333] hover:bg-[#444] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Switch to Simple View
            </button>
          </div>
        )}
      </div>
    </PreviewPanel>
  );
}

