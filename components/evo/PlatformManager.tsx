'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Session } from '@supabase/supabase-js';

interface PlatformManagerProps {
  session: Session;
  platforms: any[];
  loading: boolean;
  onRefresh: () => void;
}

type PlatformSlug = 'shopify' | 'amazon' | 'etsy' | 'ebay';

const PLATFORM_META: Record<PlatformSlug, { label: string; icon: string; description: string }> = {
  shopify: {
    label: 'Shopify',
    icon: '🛍️',
    description: 'Sync inventory and orders from your Shopify store. Uses your existing Velocity Apps connection.',
  },
  amazon: {
    label: 'Amazon',
    icon: '📦',
    description: 'Connect via Amazon Selling Partner API. Requires LWA credentials from Seller Central.',
  },
  etsy: {
    label: 'Etsy',
    icon: '🎨',
    description: 'Connect via Etsy API v3. Inventory and listing sync for your Etsy shop.',
  },
  ebay: {
    label: 'eBay',
    icon: '🏷️',
    description: 'Connect via eBay Inventory API. Sync stock levels and order status.',
  },
};

export default function PlatformManager({ session, platforms, loading, onRefresh }: PlatformManagerProps) {
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformSlug | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const platformBySlug = Object.fromEntries(
    platforms.map((p) => [p.platform, p])
  ) as Record<PlatformSlug, any>;

  async function handleConnectShopify() {
    setConnectingPlatform('shopify');
    try {
      const res = await fetch('/api/evo/platforms/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ platform: 'shopify' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to connect Shopify');
        return;
      }
      toast.success('Shopify connected to Evo');
      onRefresh();
    } catch {
      toast.error('Failed to connect Shopify');
    } finally {
      setConnectingPlatform(null);
    }
  }

  async function handleDisconnect(platform: any) {
    if (!confirm(`Disconnect ${platform.platform}? Sync will stop immediately.`)) return;
    setDisconnecting(platform.id);
    try {
      const { error } = await supabase
        .from('evo_platforms')
        .update({ status: 'disconnected' })
        .eq('id', platform.id)
        .eq('user_id', session.user.id);

      if (error) throw error;
      toast.success(`${capitalize(platform.platform)} disconnected`);
      onRefresh();
    } catch {
      toast.error('Failed to disconnect platform');
    } finally {
      setDisconnecting(null);
    }
  }

  async function handleReconnect(platform: any) {
    const { error } = await supabase
      .from('evo_platforms')
      .update({ status: 'active', error_message: null })
      .eq('id', platform.id)
      .eq('user_id', session.user.id);

    if (error) {
      toast.error('Failed to reconnect platform');
    } else {
      toast.success(`${capitalize(platform.platform)} reconnected`);
      onRefresh();
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Object.keys(PLATFORM_META) as PlatformSlug[]).map((slug) => {
          const meta = PLATFORM_META[slug];
          const record = platformBySlug[slug];
          const isConnected = record && record.status !== 'disconnected';
          const hasError = record?.status === 'error';

          return (
            <div
              key={slug}
              className={`p-5 bg-[var(--bg-primary)] border rounded-xl transition-colors ${
                isConnected
                  ? hasError
                    ? 'border-[var(--error-border)]'
                    : 'border-[var(--accent-border)]'
                  : 'border-[var(--border)]'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{meta.label}</p>
                    {record && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {record.platform_account_id}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status indicator */}
                <StatusBadge status={record?.status} />
              </div>

              {/* Description / error */}
              {hasError && record.error_message ? (
                <p className="text-xs text-[var(--error)] mb-3 bg-[var(--error-bg)] border border-[var(--error-border)] px-3 py-2 rounded-lg">
                  {record.error_message}
                </p>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
                  {meta.description}
                </p>
              )}

              {/* Sync health */}
              {isConnected && record.last_synced_at && (
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Last synced {relativeTime(record.last_synced_at)}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!record || record.status === 'disconnected' ? (
                  slug === 'shopify' ? (
                    <button
                      onClick={handleConnectShopify}
                      disabled={connectingPlatform === 'shopify'}
                      className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {connectingPlatform === 'shopify' ? 'Connecting...' : 'Connect Shopify'}
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 text-xs text-[var(--text-muted)] border border-[var(--border)] rounded-lg">
                      Coming soon
                    </span>
                  )
                ) : (
                  <>
                    {hasError && (
                      <button
                        onClick={() => handleReconnect(record)}
                        className="px-3 py-1.5 bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-medium rounded-lg hover:bg-[var(--accent-border)] transition-colors"
                      >
                        Retry connection
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(record)}
                      disabled={disconnecting === record.id}
                      className="px-3 py-1.5 bg-[var(--error-bg)] text-[var(--error)] text-xs font-medium rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      {disconnecting === record.id ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <p className="text-xs text-[var(--text-muted)] px-1">
        Connecting Shopify reuses your existing Velocity Apps OAuth token — no additional permissions required.
        Amazon, Etsy, and eBay connections are coming in a future release.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === 'disconnected') {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]">
        Not connected
      </span>
    );
  }
  const styles: Record<string, string> = {
    active:  'bg-[var(--success-bg)] text-[var(--success)]',
    paused:  'bg-[var(--warning-bg)] text-[var(--warning)]',
    error:   'bg-[var(--error-bg)] text-[var(--error)]',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${styles[status] ?? styles.active}`}>
      {status}
    </span>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
