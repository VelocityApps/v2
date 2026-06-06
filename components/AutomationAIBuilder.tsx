'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Trigger {
  type: 'order/paid' | 'order/fulfilled' | 'customer/create' | 'refund/create';
  conditions: Condition[];
}

interface Action {
  type: 'tag_customer' | 'send_discount' | 'add_order_note' | 'send_email';
  params: Record<string, string>;
}

interface ParseResult {
  draftId: string;
  trigger: Trigger;
  action: Action;
  humanReadable: string;
  confidence: number;
  lowConfidence: boolean;
}

interface AutomationAIBuilderProps {
  onClose: () => void;
  onActivated: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIGGER_LABELS: Record<Trigger['type'], string> = {
  'order/paid': 'Order Paid',
  'order/fulfilled': 'Order Fulfilled',
  'customer/create': 'New Customer',
  'refund/create': 'Refund Created',
};

const ACTION_LABELS: Record<Action['type'], string> = {
  tag_customer: 'Tag Customer',
  send_discount: 'Send Discount',
  add_order_note: 'Add Order Note',
  send_email: 'Send Email',
};

const TRIGGER_TYPES = Object.keys(TRIGGER_LABELS) as Trigger['type'][];
const ACTION_TYPES = Object.keys(ACTION_LABELS) as Action['type'][];

const OPERATOR_OPTIONS = ['greater_than', 'less_than', 'equals', 'contains', 'not_equals'];

const PLACEHOLDER_EXAMPLES = [
  'When an order is paid over $100, tag the customer as "vip"',
  'When a new customer signs up, add an order note saying "New customer — check stock"',
  'After a refund is created, send them a 10% discount code',
  'When an order is fulfilled, send the customer a thank-you email',
].join('\n');

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TriggerBadge({ type }: { type: Trigger['type'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
      <span>⚡</span>
      {TRIGGER_LABELS[type]}
    </span>
  );
}

function ActionBadge({ type }: { type: Action['type'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
      <span>→</span>
      {ACTION_LABELS[type]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AutomationAIBuilder({ onClose, onActivated }: AutomationAIBuilderProps) {
  const { session } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [shopDomain, setShopDomain] = useState('');
  const [parsing, setParsing] = useState(false);
  const [activating, setActivating] = useState(false);

  // Parse result state
  const [result, setResult] = useState<ParseResult | null>(null);
  const [unsupportedMessage, setUnsupportedMessage] = useState<string | null>(null);

  // Editable preview state (merchant can tweak before confirming)
  const [editTriggerType, setEditTriggerType] = useState<Trigger['type']>('order/paid');
  const [editConditions, setEditConditions] = useState<Condition[]>([]);
  const [editActionType, setEditActionType] = useState<Action['type']>('tag_customer');
  const [editParams, setEditParams] = useState<Record<string, string>>({});

  // Fetch the user's connected store domain on mount
  useEffect(() => {
    if (!session) return;
    supabase
      .from('user_automations')
      .select('shopify_store_url')
      .eq('user_id', session.user.id)
      .not('shopify_store_url', 'is', null)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.shopify_store_url) setShopDomain(data.shopify_store_url);
      });
  }, [session]);

  // Sync editable state when parse result arrives
  useEffect(() => {
    if (!result) return;
    setEditTriggerType(result.trigger.type);
    setEditConditions(result.trigger.conditions);
    setEditActionType(result.action.type);
    setEditParams(
      Object.fromEntries(
        Object.entries(result.action.params).map(([k, v]) => [k, String(v)])
      )
    );
  }, [result]);

  async function handleGenerate() {
    if (!session || parsing || !prompt.trim()) return;
    if (!shopDomain) {
      toast.error('No Shopify store connected. Install an automation first.');
      return;
    }
    setResult(null);
    setUnsupportedMessage(null);
    setParsing(true);
    try {
      const res = await fetch('/api/automations/ai-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt: prompt.trim(), shopDomain }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to parse automation');
        return;
      }
      if (data.unsupported) {
        setUnsupportedMessage(data.message);
        return;
      }
      setResult(data as ParseResult);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setParsing(false);
    }
  }

  async function handleActivate() {
    if (!session || !result || activating) return;
    setActivating(true);
    try {
      // Step 1: activate (create automations + user_automations rows)
      const activateRes = await fetch('/api/automations/ai-activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          draftId: result.draftId,
          trigger: { type: editTriggerType, conditions: editConditions },
          action: { type: editActionType, params: editParams },
        }),
      });
      const activateData = await activateRes.json();
      if (!activateRes.ok) {
        toast.error(activateData.error || 'Failed to activate automation');
        return;
      }

      const { userAutomationId } = activateData;
      onActivated();

      // Step 2: start billing (redirect to Shopify approval page)
      const subscribeRes = await fetch(`/api/automations/${userAutomationId}/subscribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const subscribeData = await subscribeRes.json();
      if (subscribeData.url) {
        window.location.href = subscribeData.url;
      } else {
        // Billing failed but automation is created — still a success
        toast.success('Automation created! Set up billing from your dashboard.');
        onClose();
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setActivating(false);
    }
  }

  function handleStartOver() {
    setPrompt('');
    setResult(null);
    setUnsupportedMessage(null);
  }

  function addCondition() {
    setEditConditions((prev) => [...prev, { field: '', operator: 'equals', value: '' }]);
  }

  function removeCondition(i: number) {
    setEditConditions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateCondition(i: number, key: keyof Condition, value: string) {
    setEditConditions((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [key]: value } : c))
    );
  }

  function updateParam(key: string, value: string) {
    setEditParams((prev) => ({ ...prev, [key]: value }));
  }

  const inputCls =
    'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]';
  const selectCls =
    'px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-[var(--bg-primary)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Create with AI ✨
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Describe your automation in plain English
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Prompt input */}
          {!result && !unsupportedMessage && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                What do you want to automate?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
                }}
                rows={4}
                placeholder={PLACEHOLDER_EXAMPLES}
                className={`${inputCls} resize-none leading-relaxed`}
              />
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                Press ⌘↵ to generate
              </p>
            </div>
          )}

          {/* Unsupported error */}
          {unsupportedMessage && (
            <div className="rounded-xl border border-[var(--border)] p-5 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">🤔</span>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Not supported yet
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {unsupportedMessage}
                  </p>
                </div>
              </div>
              <a
                href="mailto:hello@velocityapps.dev?subject=Feature request: custom automation"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
              >
                Request this feature →
              </a>
            </div>
          )}

          {/* Preview card */}
          {result && (
            <div className="space-y-5">
              {/* Human-readable summary */}
              <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-bg)] p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                  Claude understood your request as:
                </p>
                <p className="text-sm text-[var(--text-primary)] font-medium">
                  {result.humanReadable}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <TriggerBadge type={editTriggerType} />
                  <span className="text-[var(--text-muted)] text-sm">→</span>
                  <ActionBadge type={editActionType} />
                </div>
                {result.lowConfidence && (
                  <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    ⚠ Low confidence ({Math.round(result.confidence * 100)}%) — please review the settings below before activating.
                  </p>
                )}
              </div>

              {/* Editable trigger */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                  Trigger
                </p>
                <select
                  value={editTriggerType}
                  onChange={(e) => setEditTriggerType(e.target.value as Trigger['type'])}
                  className={`${selectCls} w-full mb-3`}
                >
                  {TRIGGER_TYPES.map((t) => (
                    <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
                  ))}
                </select>

                {editConditions.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {editConditions.map((cond, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={cond.field}
                          onChange={(e) => updateCondition(i, 'field', e.target.value)}
                          placeholder="field (e.g. total_price)"
                          className={`${inputCls} flex-1`}
                        />
                        <select
                          value={cond.operator}
                          onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                          className={selectCls}
                        >
                          {OPERATOR_OPTIONS.map((op) => (
                            <option key={op} value={op}>{op.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                        <input
                          value={cond.value}
                          onChange={(e) => updateCondition(i, 'value', e.target.value)}
                          placeholder="value"
                          className={`${inputCls} w-24`}
                        />
                        <button
                          onClick={() => removeCondition(i)}
                          className="text-[var(--text-muted)] hover:text-[var(--error)] transition-colors text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={addCondition}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
                >
                  + Add condition
                </button>
              </div>

              {/* Editable action */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                  Action
                </p>
                <select
                  value={editActionType}
                  onChange={(e) => setEditActionType(e.target.value as Action['type'])}
                  className={`${selectCls} w-full mb-3`}
                >
                  {ACTION_TYPES.map((t) => (
                    <option key={t} value={t}>{ACTION_LABELS[t]}</option>
                  ))}
                </select>

                {Object.entries(editParams).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(editParams).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-secondary)] w-28 flex-shrink-0 font-mono">
                          {key}
                        </span>
                        <input
                          value={val}
                          onChange={(e) => updateParam(key, e.target.value)}
                          className={`${inputCls} flex-1`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confidence */}
              <p className="text-xs text-[var(--text-muted)]">
                Confidence: {Math.round(result.confidence * 100)}% — {result.lowConfidence ? 'review before activating' : 'looks good'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-[var(--border)] space-y-3">
          {!result && !unsupportedMessage && (
            <button
              onClick={handleGenerate}
              disabled={parsing || !prompt.trim()}
              className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {parsing ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Analysing your request…
                </>
              ) : (
                '✦ Generate Automation'
              )}
            </button>
          )}

          {(result || unsupportedMessage) && (
            <div className="flex flex-col gap-2">
              {result && (
                <button
                  onClick={handleActivate}
                  disabled={activating}
                  className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {activating ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Activating…
                    </>
                  ) : (
                    'Activate Automation — $9/mo'
                  )}
                </button>
              )}
              <button
                onClick={handleStartOver}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-center"
              >
                ← Start over
              </button>
            </div>
          )}

          <p className="text-xs text-[var(--text-muted)] text-center">
            7-day free trial · Cancel any time
          </p>
        </div>
      </div>
    </>
  );
}
