'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ConfigForm from './ConfigForm';
import { Automation } from './AutomationCard';

interface InstallModalProps {
  automation: Automation;
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallModal({ automation, isOpen, onClose }: InstallModalProps) {
  const { session } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'connect' | 'configure' | 'installing'>('connect');
  const [shopifyStoreUrl, setShopifyStoreUrl] = useState('');
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('connect');
      setShopifyStoreUrl('');
      setShopifyConnected(false);
      setConfig({});
      setError(null);
    }

    // Check if we're returning from Shopify OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const shopifySuccess = urlParams.get('shopify_auth_success');
    const shop = urlParams.get('shop');
    const accessToken = urlParams.get('access_token');

    if (shopifySuccess === '1' && shop && accessToken && isOpen) {
      // Store in sessionStorage for install step
      sessionStorage.setItem('shopify_token', accessToken);
      sessionStorage.setItem('shopify_shop', shop);
      setStep('configure');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isOpen]);

  const handleConnectShopify = async () => {
    if (!shopifyStoreUrl) {
      setError('Please enter your Shopify store URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get authorization URL
      const response = await fetch(
        `/api/auth/shopify/authorize?shop=${encodeURIComponent(shopifyStoreUrl)}`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Redirect to Shopify OAuth
      window.location.href = data.authUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to connect Shopify store');
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!session) {
      setError('Please sign in to install automations');
      return;
    }

    // Check if we have Shopify token from OAuth callback (stored in sessionStorage)
    const shopifyToken = sessionStorage.getItem('shopify_token');
    const shop = sessionStorage.getItem('shopify_shop');

    if (!shopifyToken || !shop) {
      setError('Shopify connection not found. Please connect your store first.');
      setStep('connect');
      return;
    }

    setStep('installing');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/automations/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          automationId: automation.id,
          config,
          shopifyStoreUrl: shop,
          shopifyAccessToken: shopifyToken,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setStep('configure');
        return;
      }

      // Success - clear sessionStorage and redirect to dashboard
      sessionStorage.removeItem('shopify_token');
      sessionStorage.removeItem('shopify_shop');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to install automation');
      setStep('configure');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Install {automation.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 text-red-300 border border-red-500/50 text-sm">
            {error}
          </div>
        )}

        {step === 'connect' && (
          <div className="space-y-4">
            <p className="text-gray-300">
              Connect your Shopify store to install this automation.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Shopify Store URL
              </label>
              <input
                type="text"
                value={shopifyStoreUrl}
                onChange={(e) => setShopifyStoreUrl(e.target.value)}
                placeholder="mystore.myshopify.com"
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#0066cc] transition-colors"
              />
            </div>
            <button
              onClick={handleConnectShopify}
              disabled={loading || !shopifyStoreUrl}
              className="w-full px-4 py-3 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connecting...' : 'Connect Shopify Store'}
            </button>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-4">
            <p className="text-gray-300">
              Configure your automation settings.
            </p>
            <ConfigForm
              configSchema={automation.config_schema || {}}
              initialConfig={config}
              onChange={setConfig}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setStep('connect')}
                className="flex-1 px-4 py-3 bg-[#333] hover:bg-[#444] text-white rounded-lg font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleInstall}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Installing...' : 'Install Automation'}
              </button>
            </div>
          </div>
        )}

        {step === 'installing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066cc] mx-auto mb-4"></div>
            <p className="text-gray-300">Installing automation...</p>
          </div>
        )}
      </div>
    </div>
  );
}

