'use client';

import { useEffect, useRef, useState } from 'react';

interface ActivityEvent {
  name: string;
  icon: string;
  installed_at: string;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [slideIn, setSlideIn] = useState(false);

  // Ref so setTimeout callbacks always see the current events length
  const eventsRef = useRef<ActivityEvent[]>([]);

  useEffect(() => {
    fetch('/api/public/activity')
      .then((r) => r.json())
      .then(({ events: fetched }: { events: ActivityEvent[] }) => {
        if (fetched?.length) {
          eventsRef.current = fetched;
          setEvents(fetched);
          setTimeout(() => show(), 4000);
        }
      })
      .catch(() => {});
  }, []);

  function show() {
    setVisible(true);
    setSlideIn(true);
    setTimeout(() => {
      setSlideIn(false);
      setTimeout(() => {
        setVisible(false);
        const len = eventsRef.current.length;
        if (len > 0) {
          setIndex((i) => (i + 1) % len);
          setTimeout(() => show(), 3000);
        }
      }, 400);
    }, 4000);
  }

  if (!visible || !events.length) return null;

  const event = events[index] ?? events[0];

  return (
    <div
      className="fixed bottom-6 left-6 z-40 transition-all duration-400"
      style={{
        transform: slideIn ? 'translateY(0)' : 'translateY(120%)',
        opacity: slideIn ? 1 : 0,
        transition: 'transform 0.4s ease, opacity 0.4s ease',
      }}
    >
      <div className="flex items-center gap-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-lg px-4 py-3 max-w-xs">
        <div className="text-2xl flex-shrink-0">{event.icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
            A merchant just installed
          </p>
          <p className="text-xs text-[var(--accent)] font-medium truncate">{event.name}</p>
        </div>
        <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{timeAgo(event.installed_at)}</span>
      </div>
    </div>
  );
}
