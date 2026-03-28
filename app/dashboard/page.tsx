'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCallback } from 'react';
import AutomationCard from '@/components/automations/AutomationCard';
import Link from 'next/link';

export default function DashboardPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userAutomations, setUserAutomations] = useState<any[]>([]);
  const [suggestedAutomations, setSuggestedAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [ticketActionLoading, setTicketActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/onboarding');
      return;
    }

    if (session) {
      fetchUserAutomations();
      fetchTickets();
      fetchSuggestedAutomations();
    }
  }, [session, authLoading, router]);

  async function fetchSuggestedAutomations() {
    try {
      const { data: installed } = await supabase
        .from('user_automations')
        .select('automation_id')
        .neq('status', 'uninstalled');

      const installedIds = (installed || []).map((ua: any) => ua.automation_id);

      const query = supabase
        .from('automations')
        .select('*')
        .eq('active', true)
        .order('user_count', { ascending: false })
        .limit(3);

      if (installedIds.length > 0) {
        query.not('id', 'in', `(${installedIds.join(',')})`);
      }

      const { data } = await query;
      setSuggestedAutomations(data || []);
    } catch {
      // non-critical
    }
  }

  async function fetchUserAutomations() {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('user_automations')
        .select(`
          *,
          automation:automations(*)
        `)
        .eq('user_id', session.user.id)
        .neq('status', 'uninstalled')
        .order('installed_at', { ascending: false });

      if (error) throw error;
      setUserAutomations(data || []);
    } catch (error) {
      console.error('Error fetching user automations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTickets() {
    if (!session) return;
    try {
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      // non-critical — silently ignore
    } finally {
      setTicketsLoading(false);
    }
  }

  async function handlePause(id: string) {
    if (!session) return;

    toast.loading('Pausing automation...', { id: `pause-${id}` });

    try {
      const response = await fetch(`/api/automations/${id}/pause`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        toast.success('Automation paused', { id: `pause-${id}` });
        fetchUserAutomations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to pause automation', { id: `pause-${id}` });
      }
    } catch (error) {
      console.error('Error pausing automation:', error);
      toast.error('Failed to pause automation', { id: `pause-${id}` });
    }
  }

  async function handleResume(id: string) {
    if (!session) return;

    toast.loading('Resuming automation...', { id: `resume-${id}` });

    try {
      const response = await fetch(`/api/automations/${id}/resume`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        toast.success('Automation resumed', { id: `resume-${id}` });
        fetchUserAutomations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to resume automation', { id: `resume-${id}` });
      }
    } catch (error) {
      console.error('Error resuming automation:', error);
      toast.error('Failed to resume automation', { id: `resume-${id}` });
    }
  }

  async function handleManageBilling() {
    if (!session || billingLoading) return;
    setBillingLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to open billing portal');
      }
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleRemove(id: string) {
    if (!session) return;
    if (!confirm('Are you sure you want to remove this automation?')) return;

    toast.loading('Removing automation...', { id: `remove-${id}` });

    try {
      const response = await fetch(`/api/automations/${id}/remove`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        toast.success('Automation removed', { id: `remove-${id}` });
        fetchUserAutomations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove automation', { id: `remove-${id}` });
      }
    } catch (error) {
      console.error('Error removing automation:', error);
      toast.error('Failed to remove automation', { id: `remove-${id}` });
    }
  }

  async function handleResolveTicket(ticketId: string) {
    if (!session) return;
    setTicketActionLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: 'resolved' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Ticket marked as resolved');
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: 'resolved' } : t));
      setSelectedTicket((prev: any) => prev ? { ...prev, status: 'resolved' } : null);
    } catch {
      toast.error('Failed to update ticket');
    } finally {
      setTicketActionLoading(false);
    }
  }

  async function handleDeleteTicket(ticketId: string) {
    if (!session) return;
    setTicketActionLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Ticket deleted');
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      setSelectedTicket(null);
    } catch {
      toast.error('Failed to delete ticket');
    } finally {
      setTicketActionLoading(false);
    }
  }

  async function handleReply(ticketId: string) {
    if (!session || !replyMessage.trim()) return;
    setReplySending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: replyMessage }),
      });
      if (!res.ok) throw new Error('Failed to send reply');
      toast.success('Reply sent');
      setReplyMessage('');
      setSelectedTicket(null);
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setReplySending(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">My Automations</h1>
            <p className="text-[var(--text-secondary)]">Manage your installed automations</p>
          </div>
          <Link
            href="/marketplace"
            className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            Browse More Automations
          </Link>
        </div>

        {userAutomations.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">No automations installed</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Get started by installing your first automation
            </p>
            <Link
              href="/marketplace"
              className="inline-block px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userAutomations.map((userAutomation: any) => {
              const automation = userAutomation.automation;
              if (!automation) return null;

              return (
                <AutomationCard
                  key={userAutomation.id}
                  automation={{
                    id: automation.id,
                    name: automation.name,
                    slug: automation.slug,
                    description: automation.description,
                    category: automation.category,
                    price_monthly: automation.price_monthly,
                    icon: automation.icon,
                    features: automation.features || [],
                    user_count: automation.user_count || 0,
                    config_schema: automation.config_schema || {},
                  }}
                  variant="installed"
                  status={userAutomation.status}
                  stripeSubscriptionId={userAutomation.stripe_subscription_id}
                  trialEndsAt={userAutomation.trial_ends_at}
                  onConfigure={() => router.push(`/dashboard/automations/${userAutomation.id}`)}
                  onPause={() => handlePause(userAutomation.id)}
                  onResume={() => handleResume(userAutomation.id)}
                  onRemove={() => handleRemove(userAutomation.id)}
                  onManageBilling={handleManageBilling}
                />
              );
            })}
          </div>
        )}
        {/* Referral card */}
        {session && (
          <div className="mt-10 p-6 bg-[var(--accent-bg)] border border-[var(--accent-border)] rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-[var(--accent-text)] mb-1">Refer a merchant, get a free month</p>
              <p className="text-sm text-[var(--accent)]">Share your link — when a store owner signs up and subscribes, you both get a free month.</p>
            </div>
            <button
              onClick={() => {
                const code = session.user.id.slice(0, 8);
                const url = `${window.location.origin}/onboarding?ref=${code}`;
                navigator.clipboard.writeText(url).then(() => toast.success('Referral link copied!'));
              }}
              className="flex-shrink-0 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Copy referral link
            </button>
          </div>
        )}

        {/* Cross-sell: automations the user hasn't installed */}
        {suggestedAutomations.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">You might also like</h2>
              <Link href="/marketplace" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
                Browse all
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestedAutomations.map((automation: any) => (
                <Link
                  key={automation.id}
                  href={`/automations/${automation.slug}`}
                  className="flex items-center gap-4 p-5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/40 hover:shadow-sm transition-all"
                >
                  <div className="text-3xl flex-shrink-0">{automation.icon}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text-primary)] text-sm leading-snug">{automation.name}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">from £{automation.price_monthly}/mo · 7-day free trial</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(tickets.length > 0 || ticketsLoading) && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Support Tickets</h2>
              <Link href="/support" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-medium">
                New ticket
              </Link>
            </div>
            <div className="space-y-3">
              {ticketsLoading ? (
                <div className="h-16 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl animate-pulse" />
              ) : null}
              {tickets.map((ticket: any) => {
                const priorityStyles: Record<string, string> = {
                  critical: 'bg-[var(--error-bg)] text-[var(--error)] border-[var(--error-border)]',
                  high: 'bg-orange-50 text-orange-700 border-orange-200',
                  medium: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]',
                  low: 'bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent-border)]',
                };
                const statusStyles: Record<string, string> = {
                  open: 'bg-[var(--accent-bg)] text-[var(--accent)]',
                  in_progress: 'bg-[var(--warning-bg)] text-[var(--warning)]',
                  resolved: 'bg-[var(--success-bg)] text-[var(--success)]',
                  closed: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
                };
                const priority = ticket.priority || 'medium';
                const status = ticket.status || 'open';
                return (
                  <button
                    key={ticket.id}
                    onClick={() => { setSelectedTicket(ticket); setReplyMessage(''); }}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-5 py-4 flex items-start gap-4 hover:border-[var(--accent)]/40 hover:shadow-sm transition-all text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--text-primary)] truncate">{ticket.subject}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                        {new Date(ticket.created_at || ticket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-md border text-xs font-medium capitalize ${priorityStyles[priority] || priorityStyles.medium}`}>
                        {priority}
                      </span>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${statusStyles[status] || statusStyles.open}`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Ticket detail modal */}
    {selectedTicket && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedTicket(null)}>
        <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-5 border-b border-[var(--border)] flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{selectedTicket.subject}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {new Date(selectedTicket.created_at || selectedTicket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                <span className="capitalize">{(selectedTicket.status || 'open').replace('_', ' ')}</span>
              </p>
            </div>
            <button onClick={() => setSelectedTicket(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl leading-none mt-0.5">×</button>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{selectedTicket.message}</p>
          </div>
          <div className="px-6 pb-5 border-t border-[var(--border)] pt-4">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Add a reply</p>
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={3}
              placeholder="Add more detail or ask a follow-up question..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                {selectedTicket.status !== 'resolved' && (
                  <button
                    onClick={() => handleResolveTicket(selectedTicket.id)}
                    disabled={ticketActionLoading}
                    className="px-3 py-2 text-sm font-medium bg-[var(--success-bg)] hover:bg-[var(--success-bg)] text-[var(--success)] rounded-lg transition-colors disabled:opacity-50"
                  >
                    Mark resolved
                  </button>
                )}
                <button
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  disabled={ticketActionLoading}
                  className="px-3 py-2 text-sm font-medium bg-[var(--error-bg)] hover:bg-[var(--error-bg)] text-[var(--error)] rounded-lg transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleReply(selectedTicket.id)}
                  disabled={replySending || !replyMessage.trim()}
                  className="px-4 py-2 text-sm font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {replySending ? 'Sending...' : 'Send reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}



