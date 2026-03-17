'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AutomationCard from '@/components/automations/AutomationCard';
import InstallModal from '@/components/automations/InstallModal';

// Slugs with a full backend implementation — everything else is Coming Soon
const LIVE_SLUGS = new Set([
  'abandoned-cart-recovery',
  'best-sellers-collection',
  'low-stock-alerts',
  'review-request-automator',
  'welcome-email-series',
]);

interface AutomationMetrics {
  automationId: string;
  successRate: number;
  totalRuns: number;
  conversionRate?: number;
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f6f7]" />}>
      <MarketplaceContent />
    </Suspense>
  );
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const [automations, setAutomations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Record<string, AutomationMetrics>>({});
  const [trialedAutomationIds, setTrialedAutomationIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [installModalSlug, setInstallModalSlug] = useState<string | null>(null);

  const categories = ['all', 'marketing', 'inventory', 'seo', 'analytics', 'automation'];

  useEffect(() => {
    async function fetchAutomations() {
      try {
        const { data, error } = await supabase
          .from('automations')
          .select('*')
          .eq('active', true)
          .order('user_count', { ascending: false });

        if (error) throw error;
        setAutomations(data || []);

        // Fetch metrics only for live automations (skip Coming Soon)
        const liveAutomations = (data || []).filter((a: any) => LIVE_SLUGS.has(a.slug));
        const metricsResults = await Promise.allSettled(
          liveAutomations.map(async (automation: any) => {
            const response = await fetch(`/api/automations/${automation.id}/metrics`);
            if (!response.ok) return null;
            const metricsData = await response.json();
            return { id: automation.id, metrics: metricsData };
          })
        );
        const metricsMap: Record<string, AutomationMetrics> = {};
        for (const result of metricsResults) {
          if (result.status === 'fulfilled' && result.value) {
            metricsMap[result.value.id] = result.value.metrics;
          }
        }
        setMetrics(metricsMap);
      } catch (error) {
        console.error('Error fetching automations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAutomations();
  }, []);

  // Fetch which automations the current user has already used a trial for
  useEffect(() => {
    async function fetchTrialed() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rows } = await supabase
        .from('user_automations')
        .select('automation_id')
        .eq('user_id', user.id)
        .not('trial_started_at', 'is', null);
      if (rows?.length) setTrialedAutomationIds(new Set(rows.map((r: any) => r.automation_id)));
    }
    fetchTrialed();
  }, []);

  // Re-open install modal when returning from Shopify OAuth (install=slug&shopify_auth_success=1)
  useEffect(() => {
    const install = searchParams.get('install');
    const success = searchParams.get('shopify_auth_success');
    if (install && success === '1') setInstallModalSlug(install);
  }, [searchParams]);

  const filteredAutomations = automations.filter((auto: any) => 
    selectedCategory === 'all' || auto.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#202223]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#202223] mb-2">Automation Marketplace</h1>
          <p className="text-[#6d7175] text-lg">
            Browse {automations.length > 0 ? `${automations.length}` : '15'}+ pre-built automations for your Shopify store
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-white border border-[#e1e3e5] text-[#6d7175] hover:border-[#c9cccf] hover:text-[#202223]'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563eb] mx-auto mb-4"></div>
            <p className="text-[#6d7175]">Loading automations...</p>
          </div>
        ) : filteredAutomations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-[#6d7175] text-lg mb-2">No automations found</p>
            <p className="text-[#8c9196] text-sm">
              {selectedCategory === 'all'
                ? 'Try running the database migration to seed automations.'
                : `No automations in the "${selectedCategory}" category.`}
            </p>
          </div>
        ) : (
          <>
            {/* Automation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredAutomations.map((automation: any) => (
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
                  trialAlreadyUsed={trialedAutomationIds.has(automation.id)}
                  metrics={metrics[automation.id]}
                  comingSoon={!LIVE_SLUGS.has(automation.slug)}
                />
              ))}
            </div>

            {/* Install modal when returning from Shopify OAuth */}
            {installModalSlug && (() => {
              const automation = filteredAutomations.find((a: any) => a.slug === installModalSlug);
              if (!automation) return null;
              return (
                <InstallModal
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
                  isOpen={true}
                  onClose={() => {
                    setInstallModalSlug(null);
                    window.history.replaceState({}, '', '/marketplace');
                  }}
                />
              );
            })()}
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-center text-[#8c9196] text-sm mt-8">
                Showing {filteredAutomations.length} of {automations.length} automations
                {selectedCategory !== 'all' && ` (filtered by ${selectedCategory})`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

