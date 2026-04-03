'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

const MARKETS = [
  { code: 'GB', label: 'United Kingdom', flag: '🇬🇧', currency: '£' },
  { code: 'US', label: 'United States', flag: '🇺🇸', currency: '$' },
  { code: 'AU', label: 'Australia', flag: '🇦🇺', currency: 'A$' },
  { code: 'CA', label: 'Canada', flag: '🇨🇦', currency: 'C$' },
  { code: 'DE', label: 'Germany', flag: '🇩🇪', currency: '€' },
  { code: 'FR', label: 'France', flag: '🇫🇷', currency: '€' },
  { code: 'ES', label: 'Spain', flag: '🇪🇸', currency: '€' },
  { code: 'IT', label: 'Italy', flag: '🇮🇹', currency: '€' },
  { code: 'NL', label: 'Netherlands', flag: '🇳🇱', currency: '€' },
  { code: 'JP', label: 'Japan', flag: '🇯🇵', currency: '¥' },
  { code: 'SE', label: 'Sweden', flag: '🇸🇪', currency: 'kr' },
];

export default function MarketsPage() {
  const { session } = useAuth();

  const [productId, setProductId] = useState('');
  const [baseDescription, setBaseDescription] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(['US', 'AU', 'DE']);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('');
  const [showRaw, setShowRaw] = useState(false);
  const [savedDescriptions, setSavedDescriptions] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  function toggleMarket(code: string) {
    setSelectedMarkets(prev =>
      prev.includes(code) ? prev.filter(m => m !== code) : [...prev, code]
    );
  }

  async function handleGenerate() {
    if (!session || generating) return;
    if (!baseDescription.trim()) { toast.error('Paste a base description first.'); return; }
    if (selectedMarkets.length === 0) { toast.error('Select at least one market.'); return; }

    setGenerating(true);
    setResults({});
    const newResults: Record<string, string> = {};

    for (const market of selectedMarkets) {
      try {
        const res = await fetch('/api/generate-description/localise', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseDescription: baseDescription.trim(),
            market,
            productId: productId.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          newResults[market] = data.output;
          setResults({ ...newResults });
          if (!activeTab) setActiveTab(market);
        } else {
          toast.error(`${market}: ${data.error || 'Failed'}`);
        }
      } catch {
        toast.error(`${market}: Network error`);
      }
    }

    setGenerating(false);
    if (Object.keys(newResults).length > 0) {
      setActiveTab(Object.keys(newResults)[0]);
      toast.success(`Generated ${Object.keys(newResults).length} localised descriptions.`);
    }
  }

  const activeMarket = MARKETS.find(m => m.code === activeTab);
  const activeOutput = results[activeTab] ?? '';

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/description-writer" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors">← Back</Link>
          <div>
            <h1 className="text-2xl font-bold">Markets Localisation</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Rewrite one description for every market — tone, spelling, idioms and currency adapted for each
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left: Input ────────────────────────────────────────────────── */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-5">

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Shopify Product ID <span className="font-normal text-[var(--text-muted)]">(optional — saves per-market to DB)</span>
              </label>
              <input
                type="text"
                value={productId}
                onChange={e => setProductId(e.target.value)}
                placeholder="e.g. 8234567890123"
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Base Description (HTML or plain text) <span className="text-[var(--error)]">*</span>
              </label>
              <textarea
                value={baseDescription}
                onChange={e => setBaseDescription(e.target.value)}
                rows={7}
                placeholder="Paste your existing product description here — the one you want localised for each market…"
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Target Markets <span className="text-[var(--error)]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MARKETS.map(m => (
                  <button
                    key={m.code}
                    onClick={() => toggleMarket(m.code)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all text-sm ${
                      selectedMarkets.includes(m.code)
                        ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <span className="text-lg leading-none">{m.flag}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] leading-tight truncate">{m.label}</p>
                      <p className="text-xs text-[var(--text-muted)]">{m.currency}</p>
                    </div>
                    {selectedMarkets.includes(m.code) && (
                      <span className="ml-auto text-[var(--accent)] text-xs flex-shrink-0">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || selectedMarkets.length === 0}
              className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Localising…</>
              ) : (
                `✦ Localise for ${selectedMarkets.length} Market${selectedMarkets.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>

          {/* ── Right: Output ──────────────────────────────────────────────── */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Localised Descriptions</h2>
              {activeOutput && (
                <button
                  onClick={() => setShowRaw(v => !v)}
                  className="text-xs px-2.5 py-1 border border-[var(--border)] rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  {showRaw ? 'Preview' : 'HTML'}
                </button>
              )}
            </div>

            {Object.keys(results).length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <div className="text-4xl mb-3 opacity-30">🌍</div>
                <p className="text-sm text-[var(--text-muted)]">
                  Select markets and click Localise to generate
                </p>
              </div>
            ) : (
              <>
                {/* Market tabs */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {Object.keys(results).map(code => {
                    const m = MARKETS.find(m => m.code === code);
                    return (
                      <button
                        key={code}
                        onClick={() => setActiveTab(code)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeTab === code
                            ? 'bg-[var(--accent)] text-white'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {m?.flag} {code}
                      </button>
                    );
                  })}
                  {/* Loading indicator for in-progress markets */}
                  {generating && selectedMarkets.filter(m => !results[m]).map(code => {
                    const m = MARKETS.find(m => m.code === code);
                    return (
                      <span key={code} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-secondary)] text-[var(--text-muted)] opacity-60 animate-pulse">
                        {m?.flag} {code}
                      </span>
                    );
                  })}
                </div>

                {/* Active market output */}
                {activeOutput && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{activeMarket?.flag}</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{activeMarket?.label}</span>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto mb-4">
                      {showRaw ? (
                        <pre className="text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap break-all bg-[var(--bg-secondary)] rounded-xl p-4">
                          {activeOutput}
                        </pre>
                      ) : (
                        <div
                          className="prose prose-sm max-w-none text-[var(--text-primary)] [&_p]:text-[var(--text-primary)] [&_li]:text-[var(--text-primary)]"
                          dangerouslySetInnerHTML={{ __html: activeOutput }}
                        />
                      )}
                    </div>

                    <div className="flex gap-2 border-t border-[var(--border)] pt-4">
                      <button
                        onClick={() => { navigator.clipboard.writeText(activeOutput); toast.success('Copied!'); }}
                        className="flex-1 px-4 py-2 text-sm font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors"
                      >
                        Copy HTML
                      </button>
                      <button
                        onClick={() => {
                          const allText = Object.entries(results)
                            .map(([code, html]) => `=== ${code} ===\n${html}`)
                            .join('\n\n');
                          navigator.clipboard.writeText(allText);
                          toast.success('All markets copied!');
                        }}
                        className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        Copy All
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
