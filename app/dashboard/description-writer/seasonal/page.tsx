'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

const PRESET_EVENTS = [
  { label: 'Black Friday', date: '2026-11-27' },
  { label: 'Cyber Monday', date: '2026-11-30' },
  { label: 'Christmas', date: '2026-12-25' },
  { label: "Valentine's Day", date: '2027-02-14' },
  { label: 'Easter', date: '2027-04-05' },
  { label: 'Back to School', date: '2026-09-01' },
  { label: 'Summer Sale', date: '2026-07-01' },
  { label: 'Halloween', date: '2026-10-31' },
  { label: 'Custom', date: '' },
];

const TONES = ['casual', 'premium', 'technical', 'playful'];

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-[var(--accent-bg)] text-[var(--accent)]',
  running:   'bg-[var(--warning-bg)] text-[var(--warning)]',
  complete:  'bg-[var(--success-bg)] text-[var(--success)]',
  restored:  'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
};

export default function SeasonalPage() {
  const { session } = useAuth();

  const [collections, setCollections] = useState<any[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);

  // Form
  const [collectionId, setCollectionId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(PRESET_EVENTS[0]);
  const [customEventName, setCustomEventName] = useState('');
  const [customEventDate, setCustomEventDate] = useState('');
  const [daysBeforeEvent, setDaysBeforeEvent] = useState(7);
  const [tone, setTone] = useState('premium');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (session) {
      fetchCollections();
      fetchSchedules();
    }
  }, [session]);

  async function fetchCollections() {
    if (!session) return;
    try {
      // Fetch collections via a simple Shopify proxy
      const res = await fetch('/api/shopify/collections', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections ?? []);
      }
    } catch {
      // non-critical — user can type the ID manually
    } finally {
      setCollectionsLoading(false);
    }
  }

  async function fetchSchedules() {
    if (!session) return;
    try {
      const res = await fetch('/api/description-writer/seasonal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setSchedules(data.schedules ?? []);
    } catch {
      // non-critical
    } finally {
      setSchedulesLoading(false);
    }
  }

  async function handleCreate() {
    if (!session || creating) return;
    if (!collectionId.trim()) { toast.error('Enter a collection ID.'); return; }

    const eventName = selectedEvent.label === 'Custom' ? customEventName.trim() : selectedEvent.label;
    const eventDate = selectedEvent.label === 'Custom' ? customEventDate : selectedEvent.date;

    if (!eventName) { toast.error('Enter an event name.'); return; }
    if (!eventDate) { toast.error('Select an event date.'); return; }

    setCreating(true);
    try {
      const res = await fetch('/api/description-writer/seasonal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId: collectionId.trim(), eventName, eventDate, daysBeforeEvent, tone }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to create schedule.'); return; }
      setSchedules(prev => [...prev, data.schedule]);
      toast.success(`${eventName} refresh scheduled!`);
      setCollectionId('');
    } catch {
      toast.error('Failed to create schedule.');
    } finally {
      setCreating(false);
    }
  }

  const runDate = (eventDate: string, days: number) => {
    if (!eventDate) return '—';
    const d = new Date(eventDate);
    d.setDate(d.getDate() - days);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/description-writer" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors">← Back</Link>
          <div>
            <h1 className="text-2xl font-bold">Seasonal Refresh</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Auto-rewrite a collection before key retail events — restores itself afterwards</p>
          </div>
        </div>

        {/* Create schedule */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 mb-8">
          <h2 className="text-base font-semibold mb-5">Schedule a Refresh</h2>

          {/* Collection */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Collection ID <span className="text-[var(--error)]">*</span>
            </label>
            {collections.length > 0 ? (
              <select value={collectionId} onChange={e => setCollectionId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                <option value="">Select a collection…</option>
                {collections.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={collectionId} onChange={e => setCollectionId(e.target.value)}
                placeholder="e.g. 123456789"
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
            )}
          </div>

          {/* Event picker */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Retail Event</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {PRESET_EVENTS.map(event => (
                <button key={event.label} onClick={() => setSelectedEvent(event)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-left ${
                    selectedEvent.label === event.label
                      ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
                  }`}>
                  {event.label}
                </button>
              ))}
            </div>
          </div>

          {selectedEvent.label === 'Custom' && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Event Name</label>
                <input type="text" value={customEventName} onChange={e => setCustomEventName(e.target.value)}
                  placeholder="e.g. Summer Sale"
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Event Date</label>
                <input type="date" value={customEventDate} onChange={e => setCustomEventDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
              </div>
            </div>
          )}

          {selectedEvent.date && (
            <div className="mb-4 p-3 bg-[var(--bg-secondary)] rounded-xl text-xs text-[var(--text-secondary)]">
              Descriptions will refresh on <strong className="text-[var(--text-primary)]">{runDate(selectedEvent.date, daysBeforeEvent)}</strong> ({daysBeforeEvent} days before the event) and restore on{' '}
              <strong className="text-[var(--text-primary)]">
                {new Date(new Date(selectedEvent.date).getTime() + 86_400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </strong>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Days before event to run</label>
              <input type="number" value={daysBeforeEvent} onChange={e => setDaysBeforeEvent(Number(e.target.value))}
                min={1} max={30}
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Seasonal tone</label>
              <select value={tone} onChange={e => setTone(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                {TONES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <button onClick={handleCreate} disabled={creating}
            className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {creating ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Scheduling…</> : 'Schedule Refresh'}
          </button>
        </div>

        {/* Schedules list */}
        <div>
          <h2 className="text-base font-semibold mb-4">Scheduled Campaigns</h2>
          {schedulesLoading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl animate-pulse" />)}</div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-10 bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl">
              <p className="text-[var(--text-muted)] text-sm">No campaigns scheduled yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(s => (
                <div key={s.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{s.event_name}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Collection {s.collection_id} · Runs {new Date(s.run_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · Restores {new Date(s.restore_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${STATUS_STYLES[s.status] ?? STATUS_STYLES.scheduled}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
