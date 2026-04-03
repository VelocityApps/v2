'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

const TONES = ['casual', 'premium', 'technical', 'playful'];

export default function AbTestingPage() {
  const { session } = useAuth();

  // Create form
  const [productTitle, setProductTitle] = useState('');
  const [productId, setProductId] = useState('');
  const [bulletPoints, setBulletPoints] = useState(['', '', '']);
  const [tone, setTone] = useState('premium');
  const [visitThreshold, setVisitThreshold] = useState(200);
  const [creating, setCreating] = useState(false);

  // Results
  const [newTest, setNewTest] = useState<any | null>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (session) fetchTests();
  }, [session]);

  async function fetchTests() {
    if (!session) return;
    try {
      const res = await fetch('/api/description-writer/ab-test', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setTests(data.tests ?? []);
    } catch {
      // non-critical
    } finally {
      setLoadingTests(false);
    }
  }

  async function handleCreate() {
    if (!session || creating) return;
    if (!productTitle.trim()) { toast.error('Enter a product title.'); return; }
    if (!productId.trim()) { toast.error('Enter a Shopify product ID.'); return; }
    const bullets = bulletPoints.filter(b => b.trim());
    if (bullets.length === 0) { toast.error('Add at least one bullet point.'); return; }

    setCreating(true);
    try {
      const res = await fetch('/api/description-writer/ab-test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ productTitle, bulletPoints: bullets, tone, productId, visitThreshold }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to create test.'); return; }
      setNewTest(data.test);
      setTests(prev => [data.test, ...prev]);
      toast.success('A/B test created! Both variants generated.');
      setProductTitle(''); setProductId(''); setBulletPoints(['', '', '']);
    } catch {
      toast.error('Failed to create test.');
    } finally {
      setCreating(false);
    }
  }

  function addBullet() { setBulletPoints(p => [...p, '']); }
  function removeBullet(i: number) { setBulletPoints(p => p.filter((_, idx) => idx !== i)); }
  function updateBullet(i: number, v: string) { setBulletPoints(p => p.map((b, idx) => idx === i ? v : b)); }

  const statusBadge = (status: string, winner: string | null) => {
    if (status === 'complete') return <span className="px-2 py-0.5 text-xs font-medium bg-[var(--success-bg)] text-[var(--success)] rounded-full">Complete — {winner === 'a' ? 'A wins' : 'B wins'}</span>;
    return <span className="px-2 py-0.5 text-xs font-medium bg-[var(--accent-bg)] text-[var(--accent)] rounded-full">Running</span>;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/description-writer" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors">← Back</Link>
          <div>
            <h1 className="text-2xl font-bold">A/B Description Testing</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Generate two variants and find out which one actually converts</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-6 p-4 bg-[var(--accent-bg)] border border-[var(--accent-border)] rounded-xl text-sm">
          <p className="font-medium text-[var(--accent-text)] mb-1">How it works</p>
          <p className="text-[var(--text-secondary)] text-xs">
            Claude generates two variants simultaneously — <strong>Variant A</strong> leads with emotional benefit (how it feels),
            <strong> Variant B</strong> leads with rational benefit (what problem it solves). Record views on each variant using
            the view tracking endpoint. The winner is auto-declared once the threshold is reached and you get an email.
          </p>
        </div>

        {/* Create form */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 mb-8">
          <h2 className="text-base font-semibold mb-5">Create New A/B Test</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Product Title <span className="text-[var(--error)]">*</span></label>
              <input type="text" value={productTitle} onChange={e => setProductTitle(e.target.value)}
                placeholder="e.g. Bamboo Charging Pad"
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Shopify Product ID <span className="text-[var(--error)]">*</span></label>
              <input type="text" value={productId} onChange={e => setProductId(e.target.value)}
                placeholder="e.g. 8234567890123"
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Key Points <span className="text-[var(--error)]">*</span></label>
            <div className="space-y-2">
              {bulletPoints.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={b} onChange={e => updateBullet(i, e.target.value)}
                    placeholder={`Bullet point ${i + 1}`}
                    className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
                  {bulletPoints.length > 1 && (
                    <button onClick={() => removeBullet(i)} className="px-2 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors">×</button>
                  )}
                </div>
              ))}
            </div>
            {bulletPoints.length < 8 && (
              <button onClick={addBullet} className="mt-2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors">+ Add bullet</button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Tone</label>
              <select value={tone} onChange={e => setTone(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                {TONES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Declare winner after (views)</label>
              <input type="number" value={visitThreshold} onChange={e => setVisitThreshold(Number(e.target.value))}
                min={50} max={2000} step={50}
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
            </div>
          </div>

          <button onClick={handleCreate} disabled={creating}
            className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {creating ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Generating 2 variants…</> : '✦ Generate A/B Test'}
          </button>
        </div>

        {/* New test result */}
        {newTest && (
          <div className="mb-8 p-5 bg-[var(--success-bg)] border border-[var(--success-border,var(--border))] rounded-2xl">
            <p className="text-sm font-semibold text-[var(--success)] mb-1">Test created successfully!</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Test ID: <code className="font-mono">{newTest.id}</code> · Track views via{' '}
              <code className="font-mono text-xs">PATCH /api/description-writer/ab-test</code>
            </p>
          </div>
        )}

        {/* Tests list */}
        <div>
          <h2 className="text-base font-semibold mb-4">All Tests</h2>
          {loadingTests ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl animate-pulse" />)}</div>
          ) : tests.length === 0 ? (
            <div className="text-center py-12 bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl">
              <p className="text-[var(--text-muted)] text-sm">No tests yet. Create your first A/B test above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map(test => (
                <div key={test.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === test.id ? null : test.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Product {test.product_id}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(test.created_at).toLocaleDateString('en-GB')} · threshold: {test.visit_threshold} views
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-[var(--text-secondary)]">
                        A: {test.variant_a_views} · B: {test.variant_b_views}
                      </span>
                      {statusBadge(test.status, test.winner)}
                    </div>
                  </button>

                  {expandedId === test.id && (
                    <div className="border-t border-[var(--border)] grid grid-cols-2 gap-0 divide-x divide-[var(--border)]">
                      {['a', 'b'].map(v => {
                        const isWinner = test.winner === v;
                        const label = v === 'a' ? 'Variant A — Emotional' : 'Variant B — Rational';
                        const views = v === 'a' ? test.variant_a_views : test.variant_b_views;
                        const content = v === 'a' ? test.variant_a : test.variant_b;
                        return (
                          <div key={v} className={`p-4 ${isWinner ? 'bg-[var(--success-bg)]' : ''}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
                              {isWinner && <span className="text-xs text-[var(--success)] font-medium">👑 Winner</span>}
                              <span className="ml-auto text-xs text-[var(--text-muted)]">{views} views</span>
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] line-clamp-4 prose prose-sm max-w-none [&_p]:text-[var(--text-secondary)] [&_li]:text-[var(--text-secondary)]"
                              dangerouslySetInnerHTML={{ __html: content }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
