'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import InventoryTable from '@/components/evo/InventoryTable';
import OrderQueue from '@/components/evo/OrderQueue';
import PlatformManager from '@/components/evo/PlatformManager';
import AuditLog from '@/components/evo/AuditLog';
import AlertConfig from '@/components/evo/AlertConfig';

type Tab = 'inventory' | 'orders' | 'platforms' | 'audit' | 'alerts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'inventory', label: 'Inventory' },
  { id: 'orders',    label: 'Orders' },
  { id: 'platforms', label: 'Platforms' },
  { id: 'audit',     label: 'Audit Log' },
  { id: 'alerts',    label: 'Alerts' },
];

export default function EvoDashboardPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('inventory');
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/onboarding');
    }
  }, [session, authLoading, router]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('evo_platforms')
      .select('id, platform, platform_account_id, status, last_synced_at, error_message, metadata')
      .eq('user_id', session.user.id)
      .order('platform')
      .then(({ data }) => {
        setPlatforms(data ?? []);
        setPlatformsLoading(false);
      });
  }, [session]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  if (!session) return null;

  const activePlatforms = platforms.filter((p) => p.status === 'active');

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">Evo</h1>
              {!platformsLoading && (
                <span className="px-2.5 py-0.5 bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-semibold rounded-full border border-[var(--accent-border)]">
                  {activePlatforms.length} platform{activePlatforms.length !== 1 ? 's' : ''} connected
                </span>
              )}
            </div>
            <p className="text-[var(--text-secondary)]">
              Unified inventory and order management across all your sales channels
            </p>
          </div>

          {/* Connected platform pills */}
          {!platformsLoading && activePlatforms.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              {activePlatforms.map((p) => (
                <span
                  key={p.id}
                  className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-full text-xs font-medium text-[var(--text-secondary)] capitalize"
                >
                  {PLATFORM_ICONS[p.platform as string] ?? ''} {p.platform}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* No platforms connected — prompt */}
        {!platformsLoading && activePlatforms.length === 0 && (
          <div className="mb-8 p-5 bg-[var(--accent-bg)] border border-[var(--accent-border)] rounded-xl flex items-start gap-4">
            <div className="text-2xl mt-0.5">🔌</div>
            <div>
              <p className="font-semibold text-[var(--accent-text)] mb-0.5">Connect your first platform to get started</p>
              <p className="text-sm text-[var(--accent)]">
                Go to the <button onClick={() => setTab('platforms')} className="underline font-medium">Platforms tab</button> to connect Shopify, Amazon, Etsy, or eBay.
              </p>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-[var(--border)] mb-8">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === id
                  ? 'text-[var(--accent)] border-[var(--accent)]'
                  : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'inventory' && (
          <InventoryTable session={session} platforms={platforms} platformsLoading={platformsLoading} />
        )}
        {tab === 'orders' && (
          <OrderQueue session={session} />
        )}
        {tab === 'platforms' && (
          <PlatformManager
            session={session}
            platforms={platforms}
            loading={platformsLoading}
            onRefresh={() => {
              setPlatformsLoading(true);
              supabase
                .from('evo_platforms')
                .select('id, platform, platform_account_id, status, last_synced_at, error_message, metadata')
                .eq('user_id', session.user.id)
                .order('platform')
                .then(({ data }) => { setPlatforms(data ?? []); setPlatformsLoading(false); });
            }}
          />
        )}
        {tab === 'audit' && (
          <AuditLog session={session} />
        )}
        {tab === 'alerts' && (
          <AlertConfig session={session} />
        )}
      </div>
    </div>
  );
}

const PLATFORM_ICONS: Record<string, string> = {
  shopify: '🛍️',
  amazon:  '📦',
  etsy:    '🎨',
  ebay:    '🏷️',
};
