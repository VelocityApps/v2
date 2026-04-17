'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfigForm from '@/components/automations/ConfigForm';
import Link from 'next/link';

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

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, id]);

  useEffect(() => {
    const billing = searchParams.get('billing');
    if (billing === 'success') {
      toast.success('Automation activated!');
    } else if (billing === 'declined') {
      toast.error('Billing approval was declined. You can try again any time.');
    } else if (billing === 'error') {
      toast.error('Something went wrong with billing. Please try again.');
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
          <p className="text-[var(--text-secondary)] text-sm mt-1">Update your payment method to reactivate.</p>
          {manageBtn}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Execution Logs</h2>
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
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-[var(--text-secondary)] text-center py-8">No logs yet</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border text-sm ${
                    log.event_type === 'success' ? 'bg-[var(--success-bg)] border-[var(--success-border)]' :
                    log.event_type === 'error' ? 'bg-[var(--error-bg)] border-[var(--error-border)]' :
                    log.event_type === 'warning' ? 'bg-[var(--warning-bg)] border-[var(--warning-border)]' :
                    'bg-[var(--bg-secondary)] border-[var(--border)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold tracking-wide ${
                      log.event_type === 'success' ? 'text-[var(--success)]' :
                      log.event_type === 'error' ? 'text-[var(--error)]' :
                      log.event_type === 'warning' ? 'text-[var(--warning)]' :
                      'text-[var(--text-secondary)]'
                    }`}>
                      {log.event_type.toUpperCase()}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[var(--text-primary)]">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
