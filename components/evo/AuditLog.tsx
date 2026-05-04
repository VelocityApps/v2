'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuditLogProps {
  session: Session;
}

const TRIGGER_LABELS: Record<string, string> = {
  webhook:           'Webhook',
  order:             'Order',
  manual_adjustment: 'Manual',
  reconciliation:    'Reconciliation',
};

const PAGE_SIZE = 30;

export default function AuditLog({ session }: AuditLogProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  useEffect(() => {
    loadEvents();
  }, [session, debouncedSearch, page]);

  async function loadEvents() {
    setLoading(true);

    let query = supabase
      .from('evo_inventory_events')
      .select(`
        id,
        source_platform,
        delta,
        quantity_after,
        trigger,
        source_event_id,
        metadata,
        created_at,
        evo_sku_mappings!sku_mapping_id ( master_sku, platform )
      `, { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    // Filter by master_sku — requires a joined filter via the sku_mapping
    // We post-filter client-side since Supabase doesn't support nested column filters
    const { data, count } = await query;

    let filtered = data ?? [];
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter((e: any) =>
        e.evo_sku_mappings?.master_sku?.toLowerCase().includes(q),
      );
    }

    setEvents(filtered);
    setTotal(debouncedSearch.trim() ? filtered.length : (count ?? 0));
    setLoading(false);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
            placeholder="Search by SKU..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <span className="text-sm text-[var(--text-secondary)] ml-auto">
          {total} event{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden">
        {loading ? (
          <AuditSkeleton />
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📜</div>
            <p className="text-[var(--text-secondary)] text-sm">
              {debouncedSearch ? 'No events match your search.' : 'No inventory events yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">SKU</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Platform</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">Delta</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">Stock after</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Trigger</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {events.map((event) => {
                  const mapping = event.evo_sku_mappings;
                  const isPositive = event.delta > 0;
                  const isPropagated = event.metadata?.propagated === true;

                  return (
                    <tr key={event.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                        {mapping?.master_sku ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                          {event.source_platform}
                        </span>
                        {isPropagated && (
                          <span className="ml-1.5 text-xs text-[var(--text-muted)]">↩ propagated</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={`font-semibold text-sm ${isPositive ? 'text-[var(--success)]' : event.delta < 0 ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'}`}>
                          {isPositive ? '+' : ''}{event.delta}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-[var(--text-primary)]">
                        {event.quantity_after}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        {TRIGGER_LABELS[event.trigger] ?? event.trigger}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {formatDateTime(event.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!debouncedSearch && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--text-secondary)]">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function AuditSkeleton() {
  return (
    <>
      <div className="h-10 bg-[var(--bg-secondary)] border-b border-[var(--border)]" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-11 border-b border-[var(--border)] animate-pulse px-4 flex items-center gap-4">
          <div className="h-3 w-20 bg-[var(--border)] rounded" />
          <div className="h-4 w-14 bg-[var(--border)] rounded-full" />
          <div className="ml-auto h-3 w-8 bg-[var(--border)] rounded" />
          <div className="h-3 w-8 bg-[var(--border)] rounded" />
          <div className="h-3 w-24 bg-[var(--border)] rounded" />
        </div>
      ))}
    </>
  );
}
