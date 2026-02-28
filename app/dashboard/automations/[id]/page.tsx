'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfigForm from '@/components/automations/ConfigForm';
import Link from 'next/link';

export default function AutomationManagementPage() {
  const { session } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [userAutomation, setUserAutomation] = useState<any>(null);
  const [automation, setAutomation] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, id]);

  async function fetchData() {
    if (!session) return;

    try {
      // Fetch user automation with automation details
      const { data: userAuto, error: userAutoError } = await supabase
        .from('user_automations')
        .select(`
          *,
          automation:automations(*)
        `)
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();

      if (userAutoError) throw userAutoError;
      if (!userAuto) {
        router.push('/dashboard');
        return;
      }

      setUserAutomation(userAuto);
      setAutomation(userAuto.automation);
      setConfig(userAuto.config || {});

      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('user_automation_id', id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!logsError) {
        setLogs(logsData || []);
      }
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ config }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        toast.error(data.error);
      } else {
        setUserAutomation(data.userAutomation);
        toast.success('Configuration saved successfully!');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b82f6]"></div>
      </div>
    );
  }

  if (!userAutomation || !automation) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Automation not found</h2>
          <Link href="/dashboard" className="text-[#3b82f6] hover:text-[#2563eb]">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/dashboard"
          className="text-[#3b82f6] hover:text-[#2563eb] mb-6 inline-block"
        >
          ← Back to Dashboard
        </Link>

        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-4xl">{automation.icon}</div>
            <div>
              <h1 className="text-2xl font-bold">{automation.name}</h1>
              <p className="text-gray-400">{automation.description}</p>
            </div>
            <div className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
              userAutomation.status === 'active' ? 'bg-green-500/20 text-green-300' :
              userAutomation.status === 'trial' ? 'bg-blue-500/20 text-blue-300' :
              userAutomation.status === 'paused' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-red-500/20 text-red-300'
            }`}>
              {userAutomation.status === 'trial' ? 'Trial' : userAutomation.status}
            </div>
          </div>

          {userAutomation.status === 'trial' && userAutomation.trial_ends_at && (
            <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-blue-300 font-medium">
                Free trial ends {new Date(userAutomation.trial_ends_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                {(() => {
                  const end = new Date(userAutomation.trial_ends_at).getTime();
                  const days = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
                  if (days <= 2) return ` — ${days} day${days !== 1 ? 's' : ''} left`;
                  return ` — ${days} days left`;
                })()}
              </p>
              <p className="text-gray-400 text-sm mt-1">Then £{automation?.price_monthly}/month. Add a payment method to continue without interruption.</p>
              <Link
                href="/marketplace"
                className="inline-block mt-3 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium"
              >
                Upgrade to Pro
              </Link>
            </div>
          )}

          {userAutomation.error_message && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 text-red-300 border border-red-500/50 text-sm">
              Error: {userAutomation.error_message}
            </div>
          )}

          {userAutomation.last_run_at && (
            <div className="text-sm text-gray-400 mb-4">
              Last run: {new Date(userAutomation.last_run_at).toLocaleString()}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 text-red-300 border border-red-500/50 text-sm">
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
            className="mt-4 px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* Logs */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8">
          <h2 className="text-xl font-semibold mb-4">Execution Logs</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No logs yet</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${
                    log.event_type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                    log.event_type === 'error' ? 'bg-red-500/10 border-red-500/30' :
                    log.event_type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-[#0a0a0a] border-[#333]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${
                      log.event_type === 'success' ? 'text-green-300' :
                      log.event_type === 'error' ? 'text-red-300' :
                      log.event_type === 'warning' ? 'text-yellow-300' :
                      'text-gray-300'
                    }`}>
                      {log.event_type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



