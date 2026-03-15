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
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/onboarding');
      return;
    }

    if (session) {
      fetchUserAutomations();
      fetchTickets();
    }
  }, [session, authLoading, router]);

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563eb]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#202223]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#202223] mb-1">My Automations</h1>
            <p className="text-[#6d7175]">Manage your installed automations</p>
          </div>
          <Link
            href="/marketplace"
            className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            Browse More Automations
          </Link>
        </div>

        {userAutomations.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#e1e3e5] rounded-xl">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-xl font-bold text-[#202223] mb-2">No automations installed</h2>
            <p className="text-[#6d7175] mb-6">
              Get started by installing your first automation
            </p>
            <Link
              href="/marketplace"
              className="inline-block px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-medium transition-colors shadow-sm"
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
        {tickets.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#202223]">Support Tickets</h2>
              <Link href="/support" className="text-sm text-[#2563eb] hover:text-[#1d4ed8] transition-colors font-medium">
                New ticket
              </Link>
            </div>
            <div className="space-y-3">
              {tickets.map((ticket: any) => {
                const priorityStyles: Record<string, string> = {
                  critical: 'bg-red-50 text-red-700 border-red-200',
                  high: 'bg-orange-50 text-orange-700 border-orange-200',
                  medium: 'bg-amber-50 text-amber-700 border-amber-200',
                  low: 'bg-[#e8f0fe] text-[#2563eb] border-[#bfdbfe]',
                };
                const statusStyles: Record<string, string> = {
                  open: 'bg-[#e8f0fe] text-[#2563eb]',
                  in_progress: 'bg-amber-50 text-amber-700',
                  resolved: 'bg-[#e3f9e3] text-[#008060]',
                  closed: 'bg-[#f6f6f7] text-[#6d7175]',
                };
                const priority = ticket.priority || 'medium';
                const status = ticket.status || 'open';
                return (
                  <div key={ticket.id} className="bg-white border border-[#e1e3e5] rounded-xl px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#202223] truncate">{ticket.subject}</p>
                      <p className="text-sm text-[#6d7175] mt-0.5">
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



