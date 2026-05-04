'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';

interface InventoryTableProps {
  session: Session;
  platforms: any[];
  platformsLoading: boolean;
}

interface SkuRow {
  masterSku: string;
  productTitle: string;
  byPlatform: Record<string, { quantity: number | null; lastSyncedAt: string | null }>;
}

const ALL_PLATFORMS = ['shopify', 'amazon', 'etsy', 'ebay'] as const;

export default function InventoryTable({ session, platforms, platformsLoading }: InventoryTableProps) {
  const [rows, setRows] = useState<SkuRow[]>([]);
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [globalThreshold, setGlobalThreshold] = useState(10);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const activePlatformSlugs = platforms
    .filter((p) => p.status === 'active')
    .map((p) => p.platform as string);

  useEffect(() => {
    if (!session) return;
    loadInventory();
    loadThresholds();
  }, [session]);

  async function loadInventory() {
    setLoading(true);
    const { data: mappings } = await supabase
      .from('evo_sku_mappings')
      .select(`
        id,
        master_sku,
        platform,
        evo_products!product_id ( title ),
        evo_inventory_levels!sku_mapping_id ( quantity, last_synced_at )
      `)
      .eq('user_id', session.user.id)
      .order('master_sku');

    setRows(groupByMasterSku(mappings ?? []));
    setLoading(false);
  }

  async function loadThresholds() {
    const { data: alerts } = await supabase
      .from('evo_alerts')
      .select('master_sku, low_stock_threshold')
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    const map: Record<string, number> = {};
    let global = 10;
    for (const a of alerts ?? []) {
      if (a.master_sku) map[a.master_sku] = a.low_stock_threshold;
      else global = a.low_stock_threshold;
    }
    setThresholds(map);
    setGlobalThreshold(global);
  }

  const filtered = search.trim()
    ? rows.filter(
        (r) =>
          r.masterSku.toLowerCase().includes(search.toLowerCase()) ||
          r.productTitle.toLowerCase().includes(search.toLowerCase()),
      )
    : rows;

  if (loading || platformsLoading) {
    return <TableSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No products tracked yet</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-5">
          Map your product SKUs to start syncing inventory across platforms.
        </p>
        <Link
          href="/dashboard/evo/skus"
          className="inline-block px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          Map SKUs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or product..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <span className="text-sm text-[var(--text-secondary)]">{filtered.length} SKU{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Product</th>
                {ALL_PLATFORMS.filter((p) => activePlatformSlugs.includes(p)).map((p) => (
                  <th key={p} className="px-4 py-3 text-right font-medium text-[var(--text-secondary)] capitalize">
                    {p}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">Last Synced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((row) => {
                const threshold = thresholds[row.masterSku] ?? globalThreshold;
                // Find the most recent sync across all platforms
                const syncTimes = Object.values(row.byPlatform)
                  .map((p) => p.lastSyncedAt)
                  .filter(Boolean) as string[];
                const latestSync = syncTimes.length
                  ? syncTimes.sort().at(-1)!
                  : null;

                return (
                  <tr key={row.masterSku} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {row.masterSku}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)] max-w-xs truncate">
                      {row.productTitle}
                    </td>
                    {ALL_PLATFORMS.filter((p) => activePlatformSlugs.includes(p)).map((p) => {
                      const lvl = row.byPlatform[p];
                      if (!lvl) {
                        return (
                          <td key={p} className="px-4 py-3 text-right text-[var(--text-muted)]">—</td>
                        );
                      }
                      const qty = lvl.quantity;
                      const colorClass = stockColorClass(qty, threshold);
                      return (
                        <td key={p} className="px-4 py-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${colorClass}`}>
                            {qty ?? '—'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {latestSync ? relativeTime(latestSync) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-[var(--error-bg)] border border-[var(--error-border)]" />
          At or below threshold
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-[var(--warning-bg)] border border-[var(--warning-border)]" />
          Within 2× threshold
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-[var(--success-bg)] border border-[var(--success-border)]" />
          Healthy stock
        </span>
      </div>
    </div>
  );
}

// ── Helpers ──

function groupByMasterSku(mappings: any[]): SkuRow[] {
  const map = new Map<string, SkuRow>();
  for (const m of mappings) {
    if (!map.has(m.master_sku)) {
      map.set(m.master_sku, {
        masterSku: m.master_sku,
        productTitle: m.evo_products?.title ?? m.master_sku,
        byPlatform: {},
      });
    }
    const row = map.get(m.master_sku)!;
    // Supabase returns the reverse FK as an array even for 1-to-1
    const levelArr = m.evo_inventory_levels;
    const level = Array.isArray(levelArr) ? levelArr[0] : levelArr;
    row.byPlatform[m.platform] = {
      quantity: level?.quantity ?? null,
      lastSyncedAt: level?.last_synced_at ?? null,
    };
  }
  return Array.from(map.values());
}

function stockColorClass(quantity: number | null, threshold: number): string {
  if (quantity === null) return 'text-[var(--text-muted)]';
  if (quantity <= threshold) return 'text-[var(--error)] bg-[var(--error-bg)]';
  if (quantity <= threshold * 2) return 'text-[var(--warning)] bg-[var(--warning-bg)]';
  return 'text-[var(--success)] bg-[var(--success-bg)]';
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

function TableSkeleton() {
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="h-10 bg-[var(--bg-secondary)] border-b border-[var(--border)]" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 border-b border-[var(--border)] animate-pulse px-4 flex items-center gap-4">
          <div className="h-3 w-24 bg-[var(--border)] rounded" />
          <div className="h-3 w-40 bg-[var(--border)] rounded" />
          <div className="ml-auto h-5 w-12 bg-[var(--border)] rounded" />
        </div>
      ))}
    </div>
  );
}
