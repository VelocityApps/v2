'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface OrderQueueProps {
  session: Session;
}

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:    'bg-[var(--warning-bg)] text-[var(--warning)]',
  processing: 'bg-[var(--accent-bg)] text-[var(--accent)]',
  shipped:    'bg-[var(--accent-bg)] text-[var(--accent)]',
  delivered:  'bg-[var(--success-bg)] text-[var(--success)]',
  cancelled:  'bg-[var(--error-bg)] text-[var(--error)]',
  refunded:   'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
};

const PLATFORMS = ['all', 'shopify', 'amazon', 'etsy', 'ebay'] as const;
const STATUSES  = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;

const PAGE_SIZE = 25;

export default function OrderQueue({ session }: OrderQueueProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter]   = useState<string>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadOrders();
  }, [session, platformFilter, statusFilter, page]);

  async function loadOrders() {
    setLoading(true);
    let query = supabase
      .from('evo_orders')
      .select('*', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (platformFilter !== 'all') query = query.eq('platform', platformFilter);
    if (statusFilter   !== 'all') query = query.eq('status',   statusFilter);

    const { data, count } = await query;
    setOrders(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p === 'all' ? 'All platforms' : capitalize(p)}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : capitalize(s)}</option>
          ))}
        </select>

        <span className="text-sm text-[var(--text-secondary)] ml-auto">
          {total} order{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden">
        {loading ? (
          <OrderSkeleton />
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-[var(--text-secondary)] text-sm">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Platform</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Order ID</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Items</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-4 py-3">
                      <span className="capitalize text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                        {order.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                      #{order.platform_order_id}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)] max-w-[160px] truncate">
                      {order.customer_name || order.customer_email || '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {Array.isArray(order.line_items) ? order.line_items.length : 0} item{Array.isArray(order.line_items) && order.line_items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)] tabular-nums">
                      {order.total_price != null
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency || 'USD' }).format(order.total_price)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[order.status as OrderStatus] ?? ''}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(order.platform_created_at || order.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--text-secondary)]">
            Page {page + 1} of {totalPages}
          </span>
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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function OrderSkeleton() {
  return (
    <>
      <div className="h-10 bg-[var(--bg-secondary)] border-b border-[var(--border)]" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-12 border-b border-[var(--border)] animate-pulse px-4 flex items-center gap-4">
          <div className="h-4 w-16 bg-[var(--border)] rounded-full" />
          <div className="h-3 w-20 bg-[var(--border)] rounded" />
          <div className="h-3 w-28 bg-[var(--border)] rounded" />
          <div className="ml-auto h-4 w-14 bg-[var(--border)] rounded" />
        </div>
      ))}
    </>
  );
}
