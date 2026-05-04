'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SkuMapper from '@/components/evo/SkuMapper';

export default function SkuMappingPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !session) router.push('/onboarding');
  }, [session, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Back link */}
        <Link
          href="/dashboard/evo"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Evo
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">SKU Mappings</h1>
          <p className="text-[var(--text-secondary)]">
            Assign a master SKU to each product variant. Master SKUs link the same product across
            Shopify, Amazon, Etsy, and eBay so Evo can sync stock levels between them.
          </p>
        </div>

        {/* How it works — collapsed info */}
        <details className="mb-6 group">
          <summary className="cursor-pointer text-sm text-[var(--accent)] font-medium select-none list-none flex items-center gap-1.5">
            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            How master SKUs work
          </summary>
          <div className="mt-3 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] space-y-2">
            <p>A <strong className="text-[var(--text-primary)]">master SKU</strong> is a single identifier you assign to a product variant that Evo uses as the link across all your sales channels.</p>
            <p>Example: your Shopify variant "Black T-Shirt / M" and your Amazon ASIN "B08XYZ" both get master SKU <code className="font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">TSHIRT-BLK-M</code>. When a sale fires on Amazon and reduces stock by 1, Evo updates Shopify too.</p>
            <p>If a variant already has a SKU in Shopify, it's pre-filled below. You can keep it or override it with any unique string.</p>
          </div>
        </details>

        <SkuMapper session={session} />
      </div>
    </div>
  );
}
