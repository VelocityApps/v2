'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Session } from '@supabase/supabase-js';

interface AlertConfigProps {
  session: Session;
}

interface AlertRow {
  id: string;
  master_sku: string | null;
  low_stock_threshold: number;
  notification_methods: string[];
  email_recipients: string[];
  is_active: boolean;
}

export default function AlertConfig({ session }: AlertConfigProps) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [skus, setSkus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // alert id being saved
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newThreshold, setNewThreshold] = useState(10);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadAlerts();
    loadSkus();
  }, [session]);

  async function loadAlerts() {
    const { data } = await supabase
      .from('evo_alerts')
      .select('id, master_sku, low_stock_threshold, notification_methods, email_recipients, is_active')
      .eq('user_id', session.user.id)
      .order('master_sku', { ascending: true, nullsFirst: true });
    setAlerts(data ?? []);
    setLoading(false);
  }

  async function loadSkus() {
    const { data } = await supabase
      .from('evo_sku_mappings')
      .select('master_sku')
      .eq('user_id', session.user.id);
    const unique = [...new Set((data ?? []).map((r: any) => r.master_sku as string))].sort();
    setSkus(unique);
  }

  async function handleThresholdChange(alertId: string, value: number) {
    setSaving(alertId);
    const { error } = await supabase
      .from('evo_alerts')
      .update({ low_stock_threshold: value })
      .eq('id', alertId)
      .eq('user_id', session.user.id);

    if (error) {
      toast.error('Failed to update threshold');
    } else {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, low_stock_threshold: value } : a)),
      );
    }
    setSaving(null);
  }

  async function handleToggleActive(alertId: string, current: boolean) {
    const { error } = await supabase
      .from('evo_alerts')
      .update({ is_active: !current })
      .eq('id', alertId)
      .eq('user_id', session.user.id);

    if (error) {
      toast.error('Failed to update alert');
    } else {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_active: !current } : a)),
      );
    }
  }

  async function handleDelete(alertId: string) {
    const { error } = await supabase
      .from('evo_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', session.user.id);

    if (error) {
      toast.error('Failed to delete alert');
    } else {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.success('Alert removed');
    }
  }

  async function handleAddAlert() {
    setAdding(true);
    const extraEmails = newEmail.trim()
      ? newEmail.split(',').map((e) => e.trim()).filter(Boolean)
      : [];

    const { data, error } = await supabase
      .from('evo_alerts')
      .insert({
        user_id: session.user.id,
        master_sku: newSku.trim() || null,
        low_stock_threshold: newThreshold,
        notification_methods: ['email'],
        email_recipients: extraEmails,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create alert');
    } else {
      setAlerts((prev) => [...prev, data]);
      toast.success(newSku.trim() ? `Alert created for ${newSku.trim()}` : 'Global alert created');
      setShowAddForm(false);
      setNewSku('');
      setNewThreshold(10);
      setNewEmail('');
    }
    setAdding(false);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global threshold note */}
      <div className="p-4 bg-[var(--accent-bg)] border border-[var(--accent-border)] rounded-xl text-sm text-[var(--accent-text)]">
        <strong>Global alert</strong> (no SKU) applies as the default threshold for any SKU without a specific rule.
        Per-SKU alerts take precedence. All alerts send via your existing Resend email setup.
      </div>

      {/* Alert rows */}
      {alerts.length === 0 ? (
        <div className="text-center py-12 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-[var(--text-secondary)] text-sm mb-4">No alerts configured yet.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add your first alert
          </button>
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">SKU</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">Threshold</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Notify via</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {alerts.map((alert) => (
                  <tr key={alert.id} className={`hover:bg-[var(--bg-secondary)] transition-colors ${!alert.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                      {alert.master_sku ?? <span className="italic text-[var(--text-muted)]">Global default</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ThresholdInput
                        value={alert.low_stock_threshold}
                        disabled={saving === alert.id}
                        onCommit={(v) => handleThresholdChange(alert.id, v)}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {alert.notification_methods.join(', ')}
                      {alert.email_recipients.length > 0 && (
                        <span className="ml-1 text-[var(--text-muted)]">
                          + {alert.email_recipients.length} extra
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(alert.id, alert.is_active)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          alert.is_active ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                        }`}
                        aria-label="Toggle alert"
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            alert.is_active ? 'translate-x-[18px]' : 'translate-x-[3px]'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(alert.id)}
                        className="text-xs text-[var(--error)] hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] text-sm font-medium rounded-lg transition-colors"
          >
            + Add alert
          </button>
        </>
      )}

      {/* Add alert form */}
      {showAddForm && (
        <div className="p-5 bg-[var(--bg-primary)] border border-[var(--accent-border)] rounded-xl space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">New alert</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                SKU <span className="text-[var(--text-muted)]">(leave blank for global default)</span>
              </label>
              {skus.length > 0 ? (
                <select
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Global default</option>
                  {skus.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="e.g. SHIRT-BLK-M"
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Alert when stock falls to or below
              </label>
              <input
                type="number"
                min={0}
                max={9999}
                value={newThreshold}
                onChange={(e) => setNewThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Extra email recipients <span className="text-[var(--text-muted)]">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="ops@example.com, buyer@example.com"
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleAddAlert}
              disabled={adding}
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {adding ? 'Saving...' : 'Save alert'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline editable threshold input — commits on blur or Enter
function ThresholdInput({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));

  useEffect(() => { setLocal(String(value)); }, [value]);

  function commit() {
    const n = parseInt(local);
    if (!isNaN(n) && n >= 0 && n !== value) onCommit(n);
  }

  return (
    <input
      type="number"
      min={0}
      max={9999}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      disabled={disabled}
      className="w-20 px-2 py-1 text-right bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 tabular-nums"
    />
  );
}
