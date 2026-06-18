'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfigForm from '@/components/automations/ConfigForm';
import Link from 'next/link';

// ── ROI Preview Modal ────────────────────────────────────────────────────────
function RoiModal({
  data,
  automationName,
  priceMonthly,
  loading,
  onConfirm,
  onClose,
}: {
  data: any;
  automationName: string;
  priceMonthly: number;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-8 max-w-lg w-full shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-1">Your store · estimated impact</p>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{automationName}</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-lg leading-none">✕</button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent)]" />
            <p className="text-sm text-[var(--text-secondary)]">Scanning your store…</p>
          </div>
        ) : data?.error ? (
          <div className="py-8 text-center">
            <p className="text-[var(--text-secondary)] text-sm mb-6">Couldn't load store data — you can still activate.</p>
            <button onClick={onConfirm} className="w-full px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-semibold transition-colors shadow-sm">
              Activate · ${priceMonthly}/month
            </button>
          </div>
        ) : (
          <>
            <div className="bg-[var(--bg-secondary)] rounded-xl p-5 mb-5">
              <p className="text-lg font-bold text-[var(--text-primary)] mb-1">{data?.headline}</p>
              <p className="text-sm text-[var(--text-secondary)]">{data?.subtext}</p>
            </div>

            <div className="space-y-2 mb-5">
              {(data?.metrics ?? []).map((m: { label: string; value: string }) => (
                <div key={m.label} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-sm text-[var(--text-secondary)]">{m.label}</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{m.value}</span>
                </div>
              ))}
            </div>

            {data?.roiMultiple && data.roiMultiple > 1 && (
              <div className="bg-[var(--success-bg)] border border-[var(--success-border)] rounded-lg px-4 py-3 mb-5 text-center">
                <p className="text-sm font-semibold text-[var(--success)]">
                  Estimated {data.roiMultiple}× return on the ${priceMonthly}/month subscription
                </p>
              </div>
            )}

            <button
              onClick={onConfirm}
              className="w-full px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-semibold transition-colors shadow-sm"
            >
              Activate · ${priceMonthly}/month
            </button>
            <button onClick={onClose} className="w-full mt-2 px-6 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors">
              Not right now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Bundle Suggestions ───────────────────────────────────────────────────────
function BundleSuggestions({ currentAutomationId, session }: { currentAutomationId: string; session: any }) {
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: installed }, { data: all }] = await Promise.all([
        supabase.from('user_automations').select('automation_id').neq('status', 'uninstalled'),
        supabase.from('automations').select('id,name,description,icon,slug,price_monthly').eq('active', true).order('user_count', { ascending: false }),
      ]);
      const installedIds = new Set((installed || []).map((ua: any) => ua.automation_id));
      setSuggestions((all || []).filter((a: any) => !installedIds.has(a.id)).slice(0, 3));
    }
    load().catch(() => {});
  }, [currentAutomationId]);

  if (!suggestions.length) return null;

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-8 mb-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Add more automations</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-5">Merchants who activated this also run these automations.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {suggestions.map(s => (
          <Link
            key={s.id}
            href={`/marketplace?install=${s.slug}`}
            className="flex flex-col gap-2 p-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-bg)] transition-colors group"
          >
            <span className="text-2xl">{s.icon}</span>
            <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{s.name}</p>
            <p className="text-xs text-[var(--text-muted)] line-clamp-2">{s.description}</p>
            <p className="text-xs font-medium text-[var(--accent)] mt-auto">${s.price_monthly}/mo →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AutomationManagementPage() {
  const { session } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [userAutomation, setUserAutomation] = useState<any>(null);
  const [automation, setAutomation] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRoiModal, setShowRoiModal] = useState(false);
  const [roiData, setRoiData] = useState<any>(null);
  const [roiLoading, setRoiLoading] = useState(false);
  const [showBundleSuggestions, setShowBundleSuggestions] = useState(false);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, id]);

  useEffect(() => {
    const billing = searchParams.get('billing');
    if (billing === 'success') {
      toast.success('Automation activated!');
      setShowBundleSuggestions(true);
    } else if (billing === 'declined') {
      toast.error('Billing approval was declined. You can try again any time.');
    } else if (billing === 'error') {
      const reason = searchParams.get('reason');
      toast.error(`Billing error${reason ? `: ${reason}` : ''}. Please try again.`);
    }
  }, [searchParams]);

  async function fetchData() {
    if (!session) return;

    try {
      const { data: userAuto, error: userAutoError } = await supabase
        .from('user_automations')
        .select(`*, automation:automations(*)`)
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();

      if (userAutoError) throw userAutoError;
      if (!userAuto) { router.push('/dashboard'); return; }

      setUserAutomation(userAuto);
      setAutomation(userAuto.automation);
      setConfig(userAuto.config || {});

      const { data: logsData, error: logsError } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('user_automation_id', id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!logsError) setLogs(logsData || []);
    } catch (error: any) {
      console.error('Error fetching automation:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    if (!session) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/automations/${id}/configure`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ config }),
      });
      const data = await response.json();
      if (data.error) { setError(data.error); toast.error(data.error); }
      else { setUserAutomation(data.userAutomation); toast.success('Configuration saved successfully!'); }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    if (!session) return;
    // Show ROI preview first
    setShowRoiModal(true);
    setRoiData(null);
    setRoiLoading(true);
    try {
      const res = await fetch(`/api/automations/${id}/roi-preview`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setRoiData(data);
    } catch {
      setRoiData({ error: true });
    } finally {
      setRoiLoading(false);
    }
  }

  async function handleConfirmActivate() {
    if (!session) return;
    setShowRoiModal(false);
    setBillingLoading(true);
    try {
      const response = await fetch(`/api/automations/${id}/subscribe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (data.error) toast.error(data.error);
      else if (data.url) window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setBillingLoading(false);
    }
  }

  async function handlePortal() {
    if (!session) return;
    setBillingLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (data.error) toast.error(data.error);
      else if (data.url) window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || 'Failed to open billing portal');
    } finally {
      setBillingLoading(false);
    }
  }

  function renderBillingSection() {
    if (!userAutomation || !automation) return null;
    const { status, shopify_charge_id, stripe_subscription_id, trial_ends_at, shopify_store_url } = userAutomation;
    const priceMonthly = automation.price_monthly;
    const hasActiveSub = shopify_charge_id || stripe_subscription_id;

    const activateBtn = (label: string) => (
      <button onClick={handleActivate} disabled={billingLoading}
        className="inline-block mt-3 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm transition-colors">
        {billingLoading ? 'Loading…' : label}
      </button>
    );

    // Shopify billing — link to Shopify Admin billing settings
    const shopifyManageLink = shopify_store_url
      ? `https://${shopify_store_url.replace(/^https?:\/\//i, '').replace(/\/$/, '')}/admin/settings/billing`
      : null;

    const manageBtn = stripe_subscription_id ? (
      <button onClick={handlePortal} disabled={billingLoading}
        className="inline-block mt-3 px-4 py-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
        {billingLoading ? 'Loading…' : 'Manage subscription'}
      </button>
    ) : shopifyManageLink ? (
      <a href={shopifyManageLink} target="_blank" rel="noopener noreferrer"
        className="inline-block mt-3 px-4 py-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors">
        Manage in Shopify Admin
      </a>
    ) : null;

    if (status === 'trial') {
      const end = trial_ends_at ? new Date(trial_ends_at).getTime() : 0;
      const days = end ? Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000))) : 0;
      return (
        <div className="mb-4 p-4 rounded-lg bg-[var(--accent-bg)] border border-[var(--accent-border)]">
          <p className="text-[var(--accent-text)] font-medium">Free trial — {days} day{days !== 1 ? 's' : ''} left</p>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Then ${priceMonthly}/month. Activate now to continue without interruption.</p>
          {activateBtn('Activate Automation')}
        </div>
      );
    }

    if (status === 'active' && hasActiveSub) {
      return (
        <div className="mb-4 p-4 rounded-lg bg-[var(--success-bg)] border border-[var(--success-border)]">
          <p className="text-[var(--success)] font-medium">Active · ${priceMonthly}/month</p>
          {manageBtn}
        </div>
      );
    }

    if (status === 'paused' && hasActiveSub) {
      return (
        <div className="mb-4 p-4 rounded-lg bg-[var(--warning-bg)] border border-[var(--warning-border)]">
          <p className="text-[var(--warning)] font-medium">Paused — payment issue</p>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Resubscribe to reactivate.</p>
          {activateBtn('Resubscribe')}
        </div>
      );
    }

    if (status === 'paused' || status === 'requires_payment') {
      return (
        <div className="mb-4 p-4 rounded-lg bg-[var(--warning-bg)] border border-[var(--warning-border)]">
          <p className="text-[var(--warning)] font-medium">Trial ended</p>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Subscribe for ${priceMonthly}/month to reactivate.</p>
          {activateBtn('Activate Automation')}
        </div>
      );
    }

    if (status === 'cancelled') {
      return (
        <div className="mb-4 p-4 rounded-lg bg-[var(--error-bg)] border border-[var(--error-border)]">
          <p className="text-[var(--error)] font-medium">Cancelled</p>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Resubscribe for ${priceMonthly}/month to reactivate.</p>
          {activateBtn('Resubscribe')}
        </div>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (!userAutomation || !automation) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Automation not found</h2>
          <Link href="/dashboard" className="text-[var(--accent)] hover:text-[var(--accent-hover)]">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      {showRoiModal && (
        <RoiModal
          data={roiData}
          automationName={automation?.name ?? ''}
          priceMonthly={automation?.price_monthly ?? 0}
          loading={roiLoading}
          onConfirm={handleConfirmActivate}
          onClose={() => setShowRoiModal(false)}
        />
      )}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/dashboard" className="text-[var(--accent)] hover:text-[var(--accent-hover)] text-sm font-medium mb-6 inline-flex items-center gap-1">
          ← Back to Dashboard
        </Link>

        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-4xl">{automation.icon}</div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{automation.name}</h1>
              <p className="text-[var(--text-secondary)]">{automation.description}</p>
            </div>
            <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
              userAutomation.status === 'active' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
              userAutomation.status === 'trial' ? 'bg-[var(--accent-bg)] text-[var(--accent-text)]' :
              userAutomation.status === 'paused' ? 'bg-[var(--warning-bg)] text-[var(--warning)]' :
              'bg-[var(--error-bg)] text-[var(--error)]'
            }`}>
              {userAutomation.status === 'trial' ? 'Trial' : userAutomation.status.charAt(0).toUpperCase() + userAutomation.status.slice(1)}
            </div>
          </div>

          {renderBillingSection()}

          {userAutomation.error_message && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--error-bg)] text-[var(--error)] border border-[var(--error-border)] text-sm">
              Error: {userAutomation.error_message}
            </div>
          )}

          {userAutomation.last_run_at && (
            <div className="text-sm text-[var(--text-secondary)] mb-4">
              Last run: {new Date(userAutomation.last_run_at).toLocaleString()}
            </div>
          )}
        </div>

        {showBundleSuggestions && (
          <BundleSuggestions currentAutomationId={id} session={session} />
        )}

        {/* Configuration */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-8 mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Configuration</h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--error-bg)] text-[var(--error)] border border-[var(--error-border)] text-sm">
              {error}
            </div>
          )}
          <ConfigForm
            configSchema={automation.config_schema || {}}
            initialConfig={config}
            onChange={setConfig}
          />
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="mt-4 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* Logs */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Activity log</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">What this automation has been doing</p>
            </div>
            {logs.length > 0 && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/onboarding?ref=${session?.user.id.slice(0, 8)}`;
                  navigator.clipboard.writeText(url).then(() => toast.success('Referral link copied!'));
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              >
                Enjoying this? Refer a merchant →
              </button>
            )}
          </div>
          <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-[var(--text-secondary)] text-center py-10 text-sm">No activity yet — logs will appear here once the automation runs.</p>
            ) : (
              logs.map((log) => {
                const isRoutine = log.event_type === 'success' && (
                  log.message === 'Automation executed successfully' ||
                  log.message === 'No unpaid orders to cancel' ||
                  log.message === 'No action needed'
                );
                const icon = log.event_type === 'error' ? '✗'
                  : log.event_type === 'warning' ? '!'
                  : log.event_type === 'success' ? '✓'
                  : '·';
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(log.created_at).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 1) return 'just now';
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  const days = Math.floor(hrs / 24);
                  return days === 1 ? 'yesterday' : `${days}d ago`;
                })();

                if (isRoutine) {
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)]">
                      <span className="w-4 h-4 rounded-full border border-[var(--border)] flex items-center justify-center text-[9px] font-bold flex-shrink-0 text-[var(--text-muted)]">·</span>
                      <span className="flex-1">Ran — nothing to do</span>
                      <span className="flex-shrink-0">{timeAgo}</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-colors ${
                      log.event_type === 'error' ? 'bg-[var(--error-bg)] border-[var(--error-border)]' :
                      log.event_type === 'warning' ? 'bg-[var(--warning-bg)] border-[var(--warning-border)]' :
                      log.event_type === 'success' ? 'bg-[var(--success-bg)] border-[var(--success-border)]' :
                      'bg-[var(--bg-secondary)] border-[var(--border)]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      log.event_type === 'error' ? 'bg-red-500/20 text-[var(--error)]' :
                      log.event_type === 'warning' ? 'bg-yellow-500/20 text-[var(--warning)]' :
                      log.event_type === 'success' ? 'bg-green-500/20 text-[var(--success)]' :
                      'bg-[var(--bg-primary)] text-[var(--text-muted)]'
                    }`}>{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] leading-snug">{log.message}</p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] flex-shrink-0 mt-0.5">{timeAgo}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
