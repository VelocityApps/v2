'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

const TONES = [
  {
    id: 'casual',
    label: 'Casual',
    icon: '😊',
    description: 'Friendly, warm, conversational',
  },
  {
    id: 'premium',
    label: 'Premium',
    icon: '✨',
    description: 'Elevated, sophisticated, refined',
  },
  {
    id: 'technical',
    label: 'Technical',
    icon: '🔬',
    description: 'Precise, spec-driven, expert',
  },
  {
    id: 'playful',
    label: 'Playful',
    icon: '🎉',
    description: 'Fun, energetic, personality-led',
  },
];

const LANGUAGES = [
  { code: 'en', label: 'English (GB)' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'pl', label: 'Polish' },
  { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'ko', label: 'Korean' },
];

function DescriptionWriterPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Form state
  const [productTitle, setProductTitle] = useState('');
  const [productId, setProductId] = useState('');
  const [bulletPoints, setBulletPoints] = useState(['', '', '']);
  const [tone, setTone] = useState('premium');
  const [language, setLanguage] = useState('en');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  // Output state
  const [output, setOutput] = useState('');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // History drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Settings panel
  // Competitor mode
  const [competitorMode, setCompetitorMode] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [competitorPreview, setCompetitorPreview] = useState('');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<any | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    default_tone: 'premium',
    default_language: 'en',
    auto_trigger_enabled: false,
    brand_voice_instructions: '',
  });

  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/onboarding');
    }
  }, [session, authLoading, router]);

  useEffect(() => {
    if (!session) return;
    checkAccess();
    fetchSettings();

    // Handle billing return states
    const activated = searchParams.get('activated');
    const billing = searchParams.get('billing');
    if (activated === 'true') toast.success('AI Description Writer activated! Welcome aboard.');
    if (billing === 'declined') toast.error('Billing was declined. No charge was made.');
    if (billing === 'error') toast.error('Something went wrong with billing. Please try again.');
  }, [session]);

  async function checkAccess() {
    if (!session) return;
    try {
      const res = await fetch('/api/description-writer/access', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 401) { router.push('/onboarding'); return; }
      const data = await res.json();
      setHasAccess(data.hasAccess ?? false);
    } catch {
      setHasAccess(false);
    }
  }

  async function fetchSettings() {
    if (!session) return;
    try {
      const res = await fetch('/api/description-writer/settings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        setSettingsForm({
          default_tone: data.settings.default_tone ?? 'premium',
          default_language: data.settings.default_language ?? 'en',
          auto_trigger_enabled: data.settings.auto_trigger_enabled ?? false,
          brand_voice_instructions: data.settings.brand_voice_instructions ?? '',
        });
        setTone(data.settings.default_tone ?? 'premium');
        setLanguage(data.settings.default_language ?? 'en');
      }
    } catch {
      // non-critical
    }
  }

  async function handleUpgrade() {
    if (!session || upgradeLoading) return;
    setUpgradeLoading(true);
    try {
      const res = await fetch('/api/shopify/billing/description-writer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to start billing. Please try again.');
      }
    } catch {
      toast.error('Failed to start billing. Please try again.');
    } finally {
      setUpgradeLoading(false);
    }
  }

  async function handleGenerate() {
    if (!session || generating) return;
    if (!productTitle.trim()) { toast.error('Please enter a product title.'); return; }
    const filledBullets = bulletPoints.filter((b) => b.trim());
    if (filledBullets.length === 0) { toast.error('Please add at least one bullet point.'); return; }
    if (competitorMode && !competitorUrl.trim()) { toast.error('Enter a competitor URL or disable Competitor Mode.'); return; }

    setGenerating(true);
    setCompetitorPreview('');
    try {
      const endpoint = competitorMode ? '/api/generate-description/competitor' : '/api/generate-description';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productTitle: productTitle.trim(),
          bulletPoints: filledBullets,
          tone,
          language,
          customPrompt: customPrompt.trim() || undefined,
          productId: productId.trim() || undefined,
          ...(competitorMode ? { competitorUrl: competitorUrl.trim() } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Generation failed. Please try again.');
        return;
      }

      setOutput(data.output);
      setGenerationId(data.generationId);
      if (data.competitorText) setCompetitorPreview(data.competitorText);
      setSettingsOpen(false);
    } catch {
      toast.error('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    if (output) {
      // Current output will be saved as history via the API on next generate call
    }
    await handleGenerate();
  }

  async function fetchHistory() {
    if (!session || !productId.trim()) {
      toast.error('Enter a Product ID to view version history.');
      return;
    }
    setHistoryLoading(true);
    setHistoryOpen(true);
    try {
      const res = await fetch(
        `/api/description-writer/history?product_id=${encodeURIComponent(productId.trim())}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json();
      setHistory(data.history ?? []);
    } catch {
      toast.error('Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleRestoreVersion(historicOutput: string) {
    setOutput(historicOutput);
    setHistoryOpen(false);
    toast.success('Version restored.');
  }

  async function handleSaveSettings() {
    if (!session || settingsSaving) return;
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/description-writer/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save settings.');
        return;
      }
      setSettings(data.settings);
      setTone(data.settings.default_tone);
      setLanguage(data.settings.default_language);
      toast.success('Settings saved.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  }

  function addBullet() {
    setBulletPoints((prev) => [...prev, '']);
  }

  function removeBullet(index: number) {
    setBulletPoints((prev) => prev.filter((_, i) => i !== index));
  }

  function updateBullet(index: number, value: string) {
    setBulletPoints((prev) => prev.map((b, i) => (i === index ? value : b)));
  }

  const wordCount = output ? output.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = output ? output.replace(/<[^>]+>/g, '').length : 0;

  if (authLoading || hasAccess === null) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  // ── Upgrade gate ─────────────────────────────────────────────────────────────
  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-8 text-center shadow-lg">
          <div className="text-5xl mb-4">✍️</div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">AI Description Writer</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Generate SEO-optimised, conversion-ready product descriptions in seconds. Set a tone, drop in
            your bullet points — Claude writes the rest.
          </p>
          <ul className="text-left space-y-2 mb-8">
            {[
              'Generate descriptions for any product in seconds',
              'Four brand tones: Casual, Premium, Technical, Playful',
              'Auto-generate on new product creation (webhook)',
              'Bulk CSV mode for your entire catalogue',
              'Version history — revert to any previous generation',
              'Multilingual support (13 languages)',
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--success)] mt-0.5 flex-shrink-0">✓</span>
                {feature}
              </li>
            ))}
          </ul>
          <div className="mb-6">
            <span className="text-3xl font-bold text-[var(--text-primary)]">£19</span>
            <span className="text-[var(--text-secondary)]">/month</span>
          </div>
          <button
            onClick={handleUpgrade}
            disabled={upgradeLoading}
            className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {upgradeLoading ? 'Redirecting to Shopify...' : 'Activate AI Description Writer — £19/mo'}
          </button>
          <p className="text-xs text-[var(--text-muted)] mt-3">
            Billed via Shopify. Cancel any time from your Shopify billing settings.
          </p>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI Description Writer</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Generate SEO-optimised product descriptions with Claude
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/description-writer/bulk"
              className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Bulk Upload
            </Link>
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              ⚙ Settings
            </button>
          </div>
        </div>

        {/* Settings panel (collapsible) */}
        {settingsOpen && (
          <div className="mb-6 p-6 bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Default Tone
                </label>
                <select
                  value={settingsForm.default_tone}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, default_tone: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Default Language
                </label>
                <select
                  value={settingsForm.default_language}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, default_language: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setSettingsForm((p) => ({ ...p, auto_trigger_enabled: !p.auto_trigger_enabled }))}
                  className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${
                    settingsForm.auto_trigger_enabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      settingsForm.auto_trigger_enabled ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Auto-generate on new products</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    When you add a product in Shopify with no description, Claude writes one automatically
                  </p>
                </div>
              </label>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Brand Voice Instructions
                <span className="font-normal ml-1">(optional — prepended to every generation)</span>
              </label>
              <textarea
                value={settingsForm.brand_voice_instructions}
                onChange={(e) => setSettingsForm((p) => ({ ...p, brand_voice_instructions: e.target.value }))}
                rows={3}
                placeholder="e.g. We are a luxury skincare brand targeting women 30–50. Avoid slang. Always mention our commitment to sustainable packaging."
                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              className="px-5 py-2 text-sm font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {settingsSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left: Input ───────────────────────────────────────────────────── */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-5">

            {/* Product title */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Product Title <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="text"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                placeholder="e.g. Bamboo Wireless Charging Pad"
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Product ID (for history) */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Shopify Product ID
                <span className="font-normal ml-1 text-[var(--text-muted)]">(optional — enables version history)</span>
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="e.g. 8234567890123"
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Bullet points */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Key Points to Highlight <span className="text-[var(--error)]">*</span>
              </label>
              <div className="space-y-2">
                {bulletPoints.map((bullet, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => updateBullet(index, e.target.value)}
                      placeholder={`Bullet point ${index + 1}`}
                      className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    {bulletPoints.length > 1 && (
                      <button
                        onClick={() => removeBullet(index)}
                        className="px-2.5 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {bulletPoints.length < 8 && (
                <button
                  onClick={addBullet}
                  className="mt-2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-medium"
                >
                  + Add bullet point
                </button>
              )}
            </div>

            {/* Tone selector */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Tone <span className="text-[var(--error)]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      tone === t.id
                        ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <div className="text-lg mb-0.5">{t.icon}</div>
                    <div className="text-xs font-semibold text-[var(--text-primary)]">{t.label}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>

            {/* Custom instructions */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Custom Instructions
                <span className="font-normal ml-1 text-[var(--text-muted)]">(optional)</span>
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={2}
                placeholder="e.g. Mention our 30-day free returns. Avoid mentioning competitors."
                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            {/* Competitor mode */}
            <div className={`rounded-xl border transition-colors ${competitorMode ? 'border-[var(--accent)] bg-[var(--accent-bg)]' : 'border-[var(--border)]'} p-3`}>
              <label className="flex items-center justify-between cursor-pointer" onClick={() => setCompetitorMode(v => !v)}>
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)]">Competitor Mode</p>
                  <p className="text-xs text-[var(--text-muted)]">Paste a competitor URL — Claude positions against it</p>
                </div>
                <div className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${competitorMode ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${competitorMode ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </label>
              {competitorMode && (
                <input
                  type="url"
                  value={competitorUrl}
                  onChange={e => setCompetitorUrl(e.target.value)}
                  placeholder="https://competitor.com/product/their-version"
                  className="mt-2.5 w-full px-3 py-2 text-sm border border-[var(--accent)]/40 rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Generating…
                </>
              ) : (
                '✦ Generate Description'
              )}
            </button>
          </div>

          {/* ── Right: Output ─────────────────────────────────────────────────── */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Output</h2>
              {output && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">
                    {wordCount}w · {charCount}ch
                  </span>
                  <button
                    onClick={() => setShowRaw((v) => !v)}
                    className="text-xs px-2.5 py-1 border border-[var(--border)] rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {showRaw ? 'Preview' : 'HTML'}
                  </button>
                </div>
              )}
            </div>

            {output ? (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto mb-4">
                  {showRaw ? (
                    <pre className="text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap break-all bg-[var(--bg-secondary)] rounded-xl p-4">
                      {output}
                    </pre>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none text-[var(--text-primary)] [&_p]:text-[var(--text-primary)] [&_li]:text-[var(--text-primary)]"
                      dangerouslySetInnerHTML={{ __html: output }}
                    />
                  )}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(output);
                      toast.success('Copied to clipboard!');
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors"
                  >
                    Copy HTML
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={generating}
                    className="flex-1 px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-60"
                  >
                    {generating ? 'Generating…' : 'Regenerate'}
                  </button>
                  {productId.trim() && (
                    <button
                      onClick={fetchHistory}
                      className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      History
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <div className="text-4xl mb-3 opacity-30">✍️</div>
                <p className="text-sm text-[var(--text-muted)]">
                  Fill in the product details on the left and click{' '}
                  <span className="font-medium">Generate Description</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Competitor preview ───────────────────────────────────────────────── */}
      {competitorPreview && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <details className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <summary className="px-5 py-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors list-none flex items-center justify-between">
              <span>Competitor page content (scraped)</span>
              <span className="text-xs text-[var(--text-muted)]">click to expand</span>
            </summary>
            <div className="px-5 pb-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-secondary)] mt-3 whitespace-pre-wrap leading-relaxed">
                {competitorPreview.slice(0, 800)}{competitorPreview.length > 800 ? '…' : ''}
              </p>
            </div>
          </details>
        </div>
      )}

      {/* ── History Drawer ────────────────────────────────────────────────────── */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Version History
                <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                  last 5 generations
                </span>
              </h2>
              <button
                onClick={() => setHistoryOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {historyLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-8">
                  No history for this product yet.
                </p>
              ) : (
                history.map((item: any, i: number) => (
                  <div
                    key={item.id}
                    className="p-4 border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[var(--text-secondary)] capitalize">
                        {item.tone} · {item.language.toUpperCase()}
                        {i === 0 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-[var(--accent-bg)] text-[var(--accent)] rounded text-xs">
                            Latest
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(item.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-2">
                      {item.output.replace(/<[^>]+>/g, ' ').trim()}
                    </p>
                    <button
                      onClick={() => handleRestoreVersion(item.output)}
                      className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                    >
                      Restore this version
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DescriptionWriterPageWrapper() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}><DescriptionWriterPage /></Suspense>;
}
