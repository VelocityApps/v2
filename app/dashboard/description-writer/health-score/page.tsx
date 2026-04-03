'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-[var(--success)] bg-[var(--success-bg)]'
    : score >= 40 ? 'text-[var(--warning)] bg-[var(--warning-bg)]'
    : 'text-[var(--error)] bg-[var(--error-bg)]';
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold ${color}`}>
      {score}
    </span>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? 'bg-[var(--success)]' : score >= 40 ? 'bg-yellow-400' : 'bg-[var(--error)]';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-[var(--text-muted)]">{label}</span>
      <div className="flex-1 bg-[var(--border)] rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-6 text-right text-[var(--text-secondary)]">{score}</span>
    </div>
  );
}

export default function HealthScorePage() {
  const { session } = useAuth();
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchScores(reset = false) {
    if (!session || loading) return;
    setLoading(true);
    const currentOffset = reset ? 0 : offset;
    try {
      const res = await fetch(
        `/api/description-writer/health-score?offset=${currentOffset}&limit=50`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (res.status === 403) { toast.error('AI Description Writer subscription required.'); return; }
      const data = await res.json();
      if (reset) {
        setScores(data.scores ?? []);
        setOffset(50);
      } else {
        setScores((p) => [...p, ...(data.scores ?? [])]);
        setOffset((p) => p + 50);
      }
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
    } catch {
      toast.error('Failed to fetch scores. Check your Shopify store is connected.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFixWithAI(score: any) {
    if (!session || fixingId) return;
    setFixingId(score.product_id);
    try {
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productTitle: score.product_title,
          bulletPoints: ['See product details'],
          tone: 'premium',
          language: 'en',
          productId: score.product_id,
        }),
      });
      if (!res.ok) { toast.error('Generation failed.'); return; }
      toast.success(`Description generated for "${score.product_title}"`);
      // Refresh this product's score
      await fetchScores(true);
    } catch {
      toast.error('Failed to generate description.');
    } finally {
      setFixingId(null);
    }
  }

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + r.overall_score, 0) / scores.length)
    : 0;
  const noDescription = scores.filter((s) => s.word_count === 0).length;
  const belowFifty = scores.filter((s) => s.overall_score < 50).length;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/description-writer" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors">← Back</Link>
          <div>
            <h1 className="text-2xl font-bold">Description Health Scorer</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Score every product description in your catalogue and fix the worst performers</p>
          </div>
        </div>

        {/* Summary cards */}
        {scores.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Avg Store Score', value: `${avgScore}/100`, color: avgScore >= 70 ? 'var(--success)' : avgScore >= 40 ? '#f59e0b' : 'var(--error)' },
              { label: 'No Description', value: noDescription, color: 'var(--error)' },
              { label: 'Score Below 50', value: belowFifty, color: 'var(--warning)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Scan button */}
        {scores.length === 0 && (
          <div className="text-center py-16 bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl mb-6">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-lg font-semibold mb-2">Scan Your Catalogue</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
              Score all your product descriptions across readability, SEO, length, CTA presence, and benefit language.
            </p>
            <button onClick={() => fetchScores(true)} disabled={loading}
              className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors disabled:opacity-60">
              {loading ? 'Scanning…' : 'Scan Entire Catalogue'}
            </button>
          </div>
        )}

        {scores.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-[var(--text-secondary)]">
                Showing {scores.length} of {total} products · Worst performers first
              </p>
              <button onClick={() => fetchScores(true)} disabled={loading}
                className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors disabled:opacity-60">
                {loading ? 'Scanning…' : 'Rescan'}
              </button>
            </div>

            <div className="space-y-2">
              {scores.map((score: any) => (
                <div key={score.product_id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-4 px-5 py-3">
                    <ScoreBadge score={score.overall_score} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{score.product_title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{score.word_count} words</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(expandedId === score.product_id ? null : score.product_id)}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 border border-[var(--border)] rounded-md transition-colors"
                      >
                        {expandedId === score.product_id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => handleFixWithAI(score)}
                        disabled={fixingId === score.product_id}
                        className="text-xs font-medium px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-md transition-colors disabled:opacity-60"
                      >
                        {fixingId === score.product_id ? 'Fixing…' : 'Fix with AI'}
                      </button>
                    </div>
                  </div>

                  {expandedId === score.product_id && (
                    <div className="px-5 pb-4 space-y-2 border-t border-[var(--border)] pt-3">
                      <ScoreBar score={score.readability_score} label="Readability" />
                      <ScoreBar score={score.length_score} label="Length" />
                      <ScoreBar score={score.seo_score} label="SEO" />
                      <ScoreBar score={score.cta_score} label="CTA" />
                      <ScoreBar score={score.benefit_score} label="Benefits" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {hasMore && (
              <button onClick={() => fetchScores(false)} disabled={loading}
                className="mt-4 w-full py-3 border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-60">
                {loading ? 'Loading…' : 'Load More'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
