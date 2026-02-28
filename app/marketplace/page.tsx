'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AutomationCard from '@/components/automations/AutomationCard';
import InstallModal from '@/components/automations/InstallModal';

// Slugs with a full backend implementation — everything else is Coming Soon
const LIVE_SLUGS = new Set([
  'abandoned-cart-recovery',
  'auto-restock-alerts',
  'auto-seo-optimization',
  'auto-tag-products',
  'best-sellers-collection',
  'customer-ltv-tracker',
  'customer-segmentation',
  'low-stock-alerts',
  'order-status-auto-updates',
  'pinterest-stock-sync',
  'post-purchase-upsell',
  'review-request-automator',
  'sales-report-automator',
  'welcome-email-series',
  'win-back-campaign',
]);

interface AutomationMetrics {
  automationId: string;
  successRate: number;
  totalRuns: number;
  conversionRate?: number;
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
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

        // Fetch metrics for all automations in parallel
        const metricsResults = await Promise.allSettled(
          (data || []).map(async (automation: any) => {
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Automation Marketplace</h1>
          <p className="text-gray-400 text-lg">
            Browse {automations.length > 0 ? `${automations.length}` : '20+'} pre-built automations for your Shopify store
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#222]'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b82f6] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading automations...</p>
          </div>
        ) : filteredAutomations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-400 text-lg mb-2">No automations found</p>
            <p className="text-gray-500 text-sm">
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
              <div className="text-center text-gray-500 text-sm mt-8">
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

