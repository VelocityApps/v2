'use client';

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';

interface SkuMapperProps {
  session: Session;
}

interface VariantRow {
  shopify_product_id: string;
  product_title: string;
  product_image: string | null;
  shopify_variant_id: string;
  inventory_item_id: string;
  variant_title: string;
  shopify_sku: string;
  current_quantity: number;
  master_sku: string | null;     // from evo_sku_mappings (null = not yet mapped)
  evo_mapping_id: string | null;
  evo_product_id: string | null;
}

// Track per-variant edits keyed by inventory_item_id
type LocalSkus = Record<string, string>;

export default function SkuMapper({ session }: SkuMapperProps) {
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [localSkus, setLocalSkus] = useState<LocalSkus>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts(1, true);
  }, []);

  async function loadProducts(pageNum: number, reset: boolean) {
    if (reset) setLoading(true); else setLoadingMore(true);
    setError(null);

    try {
      const res = await fetch(`/api/evo/shopify/products?page=${pageNum}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to load products');
        return;
      }

      const incoming: VariantRow[] = data.variants ?? [];
      setVariants((prev) => reset ? incoming : [...prev, ...incoming]);

      // Pre-populate localSkus from existing mappings / Shopify SKU fields
      setLocalSkus((prev) => {
        const next = reset ? {} : { ...prev };
        for (const v of incoming) {
          if (!(v.inventory_item_id in next)) {
            // Prefer existing master_sku, fall back to Shopify's own SKU field
            next[v.inventory_item_id] = v.master_sku ?? v.shopify_sku ?? '';
          }
        }
        return next;
      });

      setHasMore(data.has_more ?? false);
      setPage(pageNum);
    } catch {
      setError('Network error — could not load products');
    } finally {
      if (reset) setLoading(false); else setLoadingMore(false);
    }
  }

  // Detect unsaved changes
  const isDirty = useMemo(() => {
    return variants.some((v) => {
      const current = localSkus[v.inventory_item_id] ?? '';
      const original = v.master_sku ?? v.shopify_sku ?? '';
      return current !== original;
    });
  }, [variants, localSkus]);

  const mappedCount = useMemo(
    () => variants.filter((v) => (localSkus[v.inventory_item_id] ?? '').trim()).length,
    [variants, localSkus],
  );

  // Search filter — applies across product title and master sku
  const filtered = useMemo(() => {
    if (!search.trim()) return variants;
    const q = search.toLowerCase();
    return variants.filter(
      (v) =>
        v.product_title.toLowerCase().includes(q) ||
        (localSkus[v.inventory_item_id] ?? '').toLowerCase().includes(q) ||
        v.shopify_sku.toLowerCase().includes(q),
    );
  }, [variants, localSkus, search]);

  // Group by shopify_product_id for display
  const grouped = useMemo(() => {
    const map = new Map<string, { product: Pick<VariantRow, 'shopify_product_id' | 'product_title' | 'product_image'>; rows: VariantRow[] }>();
    for (const v of filtered) {
      if (!map.has(v.shopify_product_id)) {
        map.set(v.shopify_product_id, {
          product: { shopify_product_id: v.shopify_product_id, product_title: v.product_title, product_image: v.product_image },
          rows: [],
        });
      }
      map.get(v.shopify_product_id)!.rows.push(v);
    }
    return Array.from(map.values());
  }, [filtered]);

  async function handleSave() {
    setSaving(true);
    const payload = variants.map((v) => ({
      shopify_product_id:  v.shopify_product_id,
      product_title:       v.product_title,
      product_image:       v.product_image,
      inventory_item_id:   v.inventory_item_id,
      shopify_variant_id:  v.shopify_variant_id,
      variant_title:       v.variant_title,
      master_sku:          (localSkus[v.inventory_item_id] ?? '').trim(),
      current_quantity:    v.current_quantity,
      evo_mapping_id:      v.evo_mapping_id,
      evo_product_id:      v.evo_product_id,
    }));

    try {
      const res = await fetch('/api/evo/skus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ mappings: payload }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to save mappings');
        return;
      }

      if (data.errors?.length) {
        data.errors.forEach((e: string) => toast.error(e));
      }

      const parts: string[] = [];
      if (data.saved > 0)   parts.push(`${data.saved} mapping${data.saved !== 1 ? 's' : ''} saved`);
      if (data.removed > 0) parts.push(`${data.removed} removed`);
      toast.success(parts.join(', ') || 'No changes');

      // Reload to reflect saved state
      await loadProducts(1, true);
    } catch {
      toast.error('Network error — changes not saved');
    } finally {
      setSaving(false);
    }
  }

  // ── Render states ─────────────────────────────────────────────────────────────

  if (loading) return <MapperSkeleton />;

  if (error) {
    const isNotConnected = error.includes('No Shopify platform');
    return (
      <div className="text-center py-16 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
        <div className="text-5xl mb-4">{isNotConnected ? '🔌' : '⚠️'}</div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {isNotConnected ? 'Shopify not connected' : 'Could not load products'}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-5">{error}</p>
        {isNotConnected ? (
          <Link
            href="/dashboard/evo"
            className="inline-block px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to Platforms
          </Link>
        ) : (
          <button
            onClick={() => loadProducts(1, true)}
            className="px-5 py-2.5 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium rounded-lg transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="text-center py-16 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
        <div className="text-5xl mb-4">📦</div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No products found</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Your Shopify store appears to have no products.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products or SKUs..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <span className="text-sm text-[var(--text-secondary)]">
          {mappedCount} / {variants.length} variant{variants.length !== 1 ? 's' : ''} mapped
        </span>

        <div className="ml-auto flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-[var(--warning)] font-medium">Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save mappings'}
          </button>
        </div>
      </div>

      {/* Product groups */}
      <div className="space-y-3">
        {grouped.length === 0 ? (
          <div className="text-center py-10 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
            <p className="text-sm text-[var(--text-secondary)]">No products match your search.</p>
          </div>
        ) : (
          grouped.map(({ product, rows }) => (
            <div key={product.shopify_product_id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden">
              {/* Product header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                {product.product_image ? (
                  <img
                    src={product.product_image}
                    alt={product.product_title}
                    className="w-9 h-9 rounded object-cover border border-[var(--border)] flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded border border-[var(--border)] bg-[var(--border)] flex-shrink-0 flex items-center justify-center text-[var(--text-muted)] text-xs">
                    No img
                  </div>
                )}
                <span className="font-semibold text-[var(--text-primary)] text-sm">{product.product_title}</span>
                <span className="ml-auto text-xs text-[var(--text-muted)]">
                  {rows.length} variant{rows.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Variant rows */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)] w-40">Variant</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)] w-36">Shopify SKU</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]">Master SKU</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--text-muted)] w-20">In stock</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-[var(--text-muted)] w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((v) => {
                    const currentSku = localSkus[v.inventory_item_id] ?? '';
                    const originalSku = v.master_sku ?? v.shopify_sku ?? '';
                    const isChanged = currentSku !== originalSku;
                    const isMapped = !!v.master_sku; // reflects saved state

                    return (
                      <tr key={v.inventory_item_id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                          {v.variant_title || <span className="italic text-[var(--text-muted)]">Default</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                          {v.shopify_sku || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={currentSku}
                            onChange={(e) =>
                              setLocalSkus((prev) => ({
                                ...prev,
                                [v.inventory_item_id]: e.target.value,
                              }))
                            }
                            placeholder="Enter master SKU..."
                            className={`w-full max-w-xs px-2.5 py-1.5 border rounded-md font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors ${
                              isChanged
                                ? 'border-[var(--warning)] bg-[var(--warning-bg)] focus:border-[var(--accent)]'
                                : 'border-[var(--border)] bg-[var(--bg-secondary)] focus:border-[var(--accent)]'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)] text-xs">
                          {v.current_quantity}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {currentSku.trim() ? (
                            isMapped && !isChanged ? (
                              <span className="text-xs text-[var(--success)] font-medium">Mapped</span>
                            ) : isChanged ? (
                              <span className="text-xs text-[var(--warning)] font-medium">Unsaved</span>
                            ) : (
                              <span className="text-xs text-[var(--accent)] font-medium">New</span>
                            )
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={() => loadProducts(page + 1, false)}
            disabled={loadingMore}
            className="px-4 py-2 text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more products'}
          </button>
        </div>
      )}

      {/* Sticky save bar — shows when dirty */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl shadow-2xl">
          <span className="text-sm font-medium">You have unsaved changes</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save now'}
          </button>
        </div>
      )}
    </div>
  );
}

function MapperSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden animate-pulse">
          <div className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center px-4 gap-3">
            <div className="w-9 h-9 rounded bg-[var(--border)]" />
            <div className="h-4 w-40 bg-[var(--border)] rounded" />
          </div>
          {[...Array(2)].map((_, j) => (
            <div key={j} className="h-12 border-b border-[var(--border)] px-4 flex items-center gap-4">
              <div className="h-3 w-20 bg-[var(--border)] rounded" />
              <div className="h-3 w-24 bg-[var(--border)] rounded" />
              <div className="h-7 w-48 bg-[var(--border)] rounded" />
              <div className="ml-auto h-3 w-8 bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
