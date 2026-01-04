'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AutomationCard from '@/components/automations/AutomationCard';

export default function OnboardingPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'connect' | 'select' | 'complete'>('connect');
  const [shopifyStoreUrl, setShopifyStoreUrl] = useState('');
  const [topAutomations, setTopAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if Shopify OAuth callback
    const shopifySuccess = searchParams.get('shopify_auth_success');
    const shop = searchParams.get('shop');
    const accessToken = searchParams.get('access_token');

    if (shopifySuccess === '1' && shop && accessToken) {
      // Store token temporarily (in production, store in database)
      sessionStorage.setItem('shopify_token', accessToken);
      sessionStorage.setItem('shopify_shop', shop);
      setStep('select');
      fetchTopAutomations();
    }

    // Check for errors
    const error = searchParams.get('shopify_auth_error');
    if (error) {
      alert(`Shopify connection error: ${error}`);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/');
    }
  }, [session, authLoading, router]);

  async function fetchTopAutomations() {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('active', true)
        .order('user_count', { ascending: false })
        .limit(3);

      if (!error) {
        setTopAutomations(data || []);
      }
    } catch (error) {
      console.error('Error fetching automations:', error);
    }
  }

  const handleConnectShopify = async () => {
    if (!shopifyStoreUrl) {
      alert('Please enter your Shopify store URL');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/auth/shopify/authorize?shop=${encodeURIComponent(shopifyStoreUrl)}`
      );
      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      // Redirect to Shopify OAuth
      window.location.href = data.authUrl;
    } catch (error: any) {
      alert(error.message || 'Failed to connect Shopify store');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066cc]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to VelocityApps</h1>
          <p className="text-gray-400 text-lg">
            Let's get your Shopify store set up with automations
          </p>
        </div>

        {step === 'connect' && (
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8">
            <h2 className="text-2xl font-semibold mb-4">Step 1: Connect Your Shopify Store</h2>
            <p className="text-gray-400 mb-6">
              Connect your Shopify store to get started with automations.
            </p>
            <div className="space-y-4">
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
                className="w-full px-6 py-3 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect Shopify Store'}
              </button>
            </div>
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8">
              <h2 className="text-2xl font-semibold mb-4">Step 2: Choose Your First Automation</h2>
              <p className="text-gray-400 mb-6">
                Pick one of our most popular automations to get started.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topAutomations.map((automation: any) => (
                <AutomationCard
                  key={automation.id}
                  automation={{
                    id: automation.id,
                    name: automation.name,
                    slug: automation.slug,
                    description: automation.description,
                    category: automation.category,
                    price_monthly: automation.price_monthly,
                    icon: automation.icon,
                    features: automation.features || [],
                    user_count: automation.user_count || 0,
                    config_schema: automation.config_schema || {},
                  }}
                  variant="marketplace"
                />
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push('/marketplace')}
                className="px-6 py-3 bg-[#333] hover:bg-[#444] text-white rounded-lg font-medium transition-colors"
              >
                Browse All Automations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

