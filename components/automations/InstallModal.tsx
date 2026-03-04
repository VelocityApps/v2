'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
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
      return;
    }

    // If already connected from a previous OAuth (e.g. onboarding flow), skip connect step
    const existingToken = sessionStorage.getItem('shopify_token');
    const existingShop = sessionStorage.getItem('shopify_shop');
    if (existingToken && existingShop) {
      setStep('configure');
      return;
    }

    // Check if we're returning from Shopify OAuth (marketplace flow)
    const urlParams = new URLSearchParams(window.location.search);
    const shopifySuccess = urlParams.get('shopify_auth_success');
    const shop = urlParams.get('shop');

    if (shopifySuccess === '1' && shop) {
      fetch('/api/auth/shopify/get-token')
        .then(res => res.json())
        .then(data => {
          if (data.token && data.shop) {
            sessionStorage.setItem('shopify_token', data.token);
            sessionStorage.setItem('shopify_shop', data.shop);
            setStep('configure');
            window.history.replaceState({}, '', window.location.pathname);
          }
        })
        .catch(err => {
          console.error('Error getting token from cookie:', err);
          toast.error('Failed to retrieve authentication token');
        });
    }
  }, [isOpen]);

  const handleConnectShopify = async () => {
    if (!shopifyStoreUrl) {
      toast.error('Please enter your Shopify store URL');
      setError('Please enter your Shopify store URL');
      return;
    }

    setLoading(true);
    setError(null);
    toast.loading('Connecting to Shopify...', { id: 'connect-shopify' });

    try {
      // Get authorization URL
      const response = await fetch(
        `/api/auth/shopify/authorize?shop=${encodeURIComponent(shopifyStoreUrl)}&install=${encodeURIComponent(automation.slug)}`
      );
      const data = await response.json();

      if (data.error) {
        toast.error(data.error, { id: 'connect-shopify' });
        setError(data.error);
        return;
      }

      toast.success('Redirecting to Shopify...', { id: 'connect-shopify' });
      // Redirect to Shopify OAuth
      window.location.href = data.authUrl;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect Shopify store';
      toast.error(errorMessage, { id: 'connect-shopify' });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!session) {
      toast.error('Please sign in to install automations');
      setError('Please sign in to install automations');
      return;
    }

    // Check if we have Shopify token from OAuth callback (stored in sessionStorage)
    const shopifyToken = sessionStorage.getItem('shopify_token');
    const shop = sessionStorage.getItem('shopify_shop');

    if (!shopifyToken || !shop) {
      const errorMessage = 'Shopify connection not found. Please connect your store first.';
      toast.error(errorMessage);
      setError(errorMessage);
      setStep('connect');
      return;
    }

    setStep('installing');
    setLoading(true);
    setError(null);
    toast.loading('Installing automation...', { id: 'install-automation' });

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
        toast.error(data.error, { id: 'install-automation' });
        setError(data.error);
        setStep('configure');
        return;
      }

      // Success - clear sessionStorage and redirect to dashboard
      sessionStorage.removeItem('shopify_token');
      sessionStorage.removeItem('shopify_shop');
      toast.success(`${automation.name} installed successfully!`, { id: 'install-automation' });
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to install automation';
      toast.error(errorMessage, { id: 'install-automation' });
      setError(errorMessage);
      setStep('configure');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e1e3e5] rounded-2xl p-8 max-w-2xl w-full shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#202223]">Install {automation.name}</h2>
          <button
            onClick={onClose}
            className="text-[#6d7175] hover:text-[#202223] transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
            {error}
          </div>
        )}

        {step === 'connect' && (
          <div className="space-y-4">
            <p className="text-[#6d7175] text-sm">
              Connect your Shopify store to install this automation.
            </p>
            <div>
              <label className="block text-sm font-medium text-[#202223] mb-1.5">
                Shopify store URL
              </label>
              <input
                type="text"
                value={shopifyStoreUrl}
                onChange={(e) => setShopifyStoreUrl(e.target.value)}
                placeholder="mystore.myshopify.com"
                className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors"
              />
            </div>
            <button
              onClick={handleConnectShopify}
              disabled={loading || !shopifyStoreUrl}
              className="w-full px-4 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'Connecting...' : 'Connect Shopify Store'}
            </button>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-4">
            <p className="text-[#6d7175] text-sm">
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
                className="flex-1 px-4 py-3 bg-white hover:bg-[#f6f6f7] border border-[#e1e3e5] text-[#202223] rounded-lg font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleInstall}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? 'Installing...' : 'Install Automation'}
              </button>
            </div>
          </div>
        )}

        {step === 'installing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563eb] mx-auto mb-4"></div>
            <p className="text-[#6d7175]">Installing automation...</p>
          </div>
        )}
      </div>
    </div>
  );
}

