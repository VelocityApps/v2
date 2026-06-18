'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import ExitIntentPopup from '@/components/ExitIntentPopup';

// ─── Data ────────────────────────────────────────────────────────────────────

const AUTOMATIONS = [
  { icon: '🛒', name: 'Abandoned Cart Recovery', category: 'Revenue', price: 36, roi: 'Recover up to 15% of abandoned carts', slug: 'abandoned-cart-recovery' },
  { icon: '⭐', name: 'Review Request Automator', category: 'Social proof', price: 24, roi: 'Get 3× more reviews on autopilot', slug: 'review-request-automator' },
  { icon: '📦', name: 'Low Stock Alerts', category: 'Inventory', price: 19, roi: 'Save ~5 hrs/week on stock checks', slug: 'low-stock-alerts' },
  { icon: '✉️', name: 'Welcome Email Series', category: 'Retention', price: 30, roi: 'Convert new subscribers 22% better', slug: 'welcome-email-series' },
  { icon: '🔁', name: 'Win-Back Campaign', category: 'Retention', price: 36, roi: 'Win back 1 in 5 lapsed customers', slug: 'win-back-campaign' },
  { icon: '🏆', name: 'Best Sellers Collection', category: 'Merchandising', price: 19, roi: 'Keep top sellers front and centre', slug: 'best-sellers-collection' },
];

const PAIN_POINTS = [
  {
    problem: 'You forget to follow up on abandoned carts',
    solution: 'Abandoned Cart Recovery sends personalised emails within the hour — automatically, every time.',
    automation: 'Abandoned Cart Recovery',
    icon: '🛒',
    metric: 'Up to 15% recovery rate',
  },
  {
    problem: 'You miss stock-outs until customers start complaining',
    solution: 'Low Stock Alerts ping you the moment any product drops below your threshold.',
    automation: 'Low Stock Alerts',
    icon: '📦',
    metric: 'Never miss a stock-out again',
  },
  {
    problem: 'You\'re not getting enough reviews',
    solution: 'Review Request Automator sends requests at exactly the right moment — 7 days after delivery.',
    automation: 'Review Request Automator',
    icon: '⭐',
    metric: '3× more reviews on autopilot',
  },
  {
    problem: 'Customers who haven\'t bought in 90+ days just disappear',
    solution: 'Win-Back Campaign automatically re-engages lapsed customers with a compelling offer.',
    automation: 'Win-Back Campaign',
    icon: '🔁',
    metric: 'Win back 1 in 5 lapsed customers',
  },
  {
    problem: 'New subscribers get no welcome — and bounce',
    solution: 'Welcome Email Series greets every new subscriber with a 3-email sequence that converts.',
    automation: 'Welcome Email Series',
    icon: '✉️',
    metric: '22% better new subscriber conversion',
  },
];

const LIVE_FEED = [
  { icon: '💰', text: 'Recovered £127 — Sarah left 3 items in her cart 1h ago', time: 'just now', color: 'text-green-400' },
  { icon: '⭐', text: 'Review request sent to james@... (Order #4821)', time: '2m ago', color: 'text-yellow-400' },
  { icon: '📦', text: 'Low stock alert: Air Max Hoodie — 2 units left', time: '5m ago', color: 'text-orange-400' },
  { icon: '🔁', text: 'Win-back email sent to 14 customers (90+ days inactive)', time: '12m ago', color: 'text-blue-400' },
  { icon: '✉️', text: 'Welcome email sent to emma@... (just subscribed)', time: '18m ago', color: 'text-purple-400' },
  { icon: '💰', text: 'Recovered £243 — Mike returned for his abandoned Nikes', time: '24m ago', color: 'text-green-400' },
  { icon: '⭐', text: 'New 5★ review from Order #4799 — request sent 7 days ago', time: '31m ago', color: 'text-yellow-400' },
  { icon: '📦', text: 'Restock alert: Oversized Tee (Black) reached 5 units', time: '45m ago', color: 'text-orange-400' },
];

const PRO_FEATURES = [
  'All automations — current & future',
  'Abandoned Cart Recovery',
  'Welcome Email Series',
  'Review Request Automator',
  'Low Stock Alerts',
  'Win-Back Campaign',
  'Best Sellers Collection',
  'Priority support (< 2 hr response)',
  'Live execution logs',
];

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: '60-second install',
    description: 'Connect your Shopify store and activate any automation in under a minute. No developer, no config files.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure by default',
    description: 'AES-256 encrypted tokens, row-level security, and SOC 2-aligned infrastructure. Your store data never leaves our encrypted stack.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Live execution logs',
    description: 'See exactly what each automation did, when it ran, and why — in plain English. Full audit trail, always.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: 'Pay per automation',
    description: 'Subscribe only to what you need. Cancel any individual automation at any time. No contracts.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Real support',
    description: 'Email and in-app support with a 4-hour response guarantee. Talk to a human, not a bot.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: 'Runs 24 / 7',
    description: 'Webhook-driven and cron-scheduled. Your automations run around the clock without you lifting a finger.',
  },
];

// ─── Live demo feed ───────────────────────────────────────────────────────────

function LiveFeed() {
  const [items, setItems] = useState(LIVE_FEED.slice(0, 4));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        idx = (idx + 1) % LIVE_FEED.length;
        setItems(prev => [LIVE_FEED[idx], ...prev.slice(0, 3)]);
        setVisible(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Live automation feed</span>
      </div>
      <div className="divide-y divide-white/5">
        {items.map((item, i) => (
          <div
            key={`${item.text}-${i}`}
            className="flex items-start gap-3 px-4 py-3 transition-opacity duration-300"
            style={{ opacity: i === 0 ? (visible ? 1 : 0) : 1 }}
          >
            <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium leading-snug ${item.color}`}>{item.text}</p>
              <p className="text-xs text-white/30 mt-0.5">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ROI Calculator ───────────────────────────────────────────────────────────

function RoiCalculator() {
  const [visitors, setVisitors] = useState(10000);
  const [aov, setAov] = useState(50);
  const [abandonRate, setAbandonRate] = useState(70);

  const cartsStarted = Math.round(visitors * 0.05);
  const abandonedCarts = Math.round(cartsStarted * (abandonRate / 100));
  const lostRevenue = abandonedCarts * aov;
  const monthlyRecovery = Math.round(lostRevenue * 0.15);
  const annualOpportunity = monthlyRecovery * 12;

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

  const Slider = ({ label, value, min, max, step, onChange, prefix, suffix }: {
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void; prefix?: string; suffix?: string;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-white/80">{label}</label>
        <div className="relative">
          {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40">{prefix}</span>}
          <input
            type="number" min={min} max={max} step={step} value={value}
            onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }}
            className={`w-24 py-1 text-sm font-bold text-right rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${prefix ? 'pl-5 pr-2' : suffix ? 'pl-2 pr-6' : 'px-2'}`}
          />
          {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40">{suffix}</span>}
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500 cursor-pointer h-1.5"
      />
    </div>
  );

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0f172a 100%)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-20"
          style={{ background: 'radial-gradient(ellipse, #3b82f6 0%, transparent 70%)' }} />
      </div>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-5 uppercase tracking-wider">
            Revenue calculator
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">How much are you losing right now?</h2>
          <p className="text-slate-400 text-lg">Drag the sliders — see the money you're leaving on the table.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-7 space-y-7">
            <Slider label="Monthly website visitors" value={visitors} min={10} max={1000000} step={100} onChange={setVisitors} />
            <Slider label="Average order value" value={aov} min={1} max={5000} step={1} onChange={setAov} prefix="$" />
            <Slider label="Cart abandonment rate" value={abandonRate} min={1} max={95} step={1} onChange={setAbandonRate} suffix="%" />
          </div>

          <div className="grid grid-cols-2 gap-4 content-start">
            {[
              { label: 'Abandoned carts/mo', value: abandonedCarts.toLocaleString(), sub: `of ~${cartsStarted.toLocaleString()} started`, highlight: false },
              { label: 'Revenue lost/mo', value: fmt(lostRevenue), sub: 'walking out the door', highlight: false },
              { label: 'Est. monthly recovery', value: fmt(monthlyRecovery), sub: 'at 15% recovery rate', highlight: true },
              { label: 'Annual opportunity', value: fmt(annualOpportunity), sub: 'if you start today', highlight: true },
            ].map(({ label, value, sub, highlight }) => (
              <div key={label} className={`rounded-xl p-5 text-center border ${highlight ? 'bg-blue-500/20 border-blue-400/30' : 'bg-white/5 border-white/10'}`}>
                <div className={`text-2xl sm:text-3xl font-extrabold mb-1 ${highlight ? 'text-blue-300' : 'text-white'}`}>{value}</div>
                <div className="text-xs font-semibold text-white/60 mb-1">{label}</div>
                <div className="text-xs text-white/35">{sub}</div>
              </div>
            ))}

            <div className="col-span-2">
              <Link
                href="/onboarding"
                className="block w-full py-4 text-center bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold text-base transition-colors shadow-lg shadow-blue-500/30"
              >
                Start recovering revenue — free for 7 days
              </Link>
              <p className="text-xs text-white/30 text-center mt-2">No credit card · Cancel anytime</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

function PricingSection({ session }: { session: any }) {
  const [annual, setAnnual] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  async function handleUpgrade() {
    if (!session) { window.location.href = '/onboarding'; return; }
    setUpgrading(true);
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ planType: 'pro' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { setUpgrading(false); }
  }

  const monthlyPrice = 79;
  const annualMonthly = 59;

  return (
    <section className="bg-[var(--bg-secondary)] border-y border-[var(--border)] py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] mb-3">Simple, transparent pricing</h2>
          <p className="text-[var(--text-secondary)] text-lg">Pay per automation, or go PRO for everything.</p>
          <div className="inline-flex items-center gap-1 mt-8 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-1">
            <button onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!annual ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >Monthly</button>
            <button onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${annual ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Annual
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${annual ? 'bg-white/20 text-white' : 'bg-green-500/15 text-green-500'}`}>
                Save 25%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Starter */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-8">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Starter</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Pick only what you need.</p>
            <div className="mb-5">
              <span className="text-4xl font-extrabold text-[var(--text-primary)]">from $19</span>
              <span className="text-[var(--text-secondary)] ml-1 text-sm">/ automation / mo</span>
            </div>
            <div className="mb-6 space-y-1.5">
              {[['Best Sellers Collection', '$19'], ['Low Stock Alerts', '$19'], ['Review Request Automator', '$24'], ['Welcome Email Series', '$30'], ['Abandoned Cart Recovery', '$36']].map(([name, price]) => (
                <div key={name} className="flex items-center justify-between text-xs border-b border-[var(--border)] pb-1.5">
                  <span className="text-[var(--text-secondary)]">{name}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{price}/mo</span>
                </div>
              ))}
            </div>
            <ul className="space-y-2.5 mb-8">
              {['7-day free trial per automation', 'Cancel any automation anytime', 'Standard support (< 4 hr)', 'Live execution logs'].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/marketplace" className="block w-full py-3 text-center border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
              Browse automations
            </Link>
          </div>

          {/* PRO */}
          <div className="bg-blue-600 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4 px-2.5 py-1 bg-white/20 rounded-md text-white text-xs font-semibold">Best value</div>
            <h3 className="text-lg font-bold text-white mb-1">PRO</h3>
            <p className="text-sm text-blue-200 mb-6">Everything, one flat price.</p>
            <div className="mb-1 flex items-end gap-2">
              {annual && <span className="text-blue-300 line-through text-lg font-semibold">${monthlyPrice}</span>}
              <span className="text-4xl font-extrabold text-white">${annual ? annualMonthly : monthlyPrice}</span>
              <span className="text-blue-200 text-sm mb-1">/ mo</span>
            </div>
            <p className="text-blue-200 text-sm mb-6">{annual ? `Billed $${annualMonthly * 12} annually — save $${(monthlyPrice - annualMonthly) * 12}/yr` : 'Billed monthly, cancel anytime'}</p>
            <ul className="space-y-2.5 mb-8">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-white">
                  <svg className="w-4 h-4 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={handleUpgrade} disabled={upgrading}
              className="block w-full py-3 text-center bg-white text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-60">
              {upgrading ? 'Redirecting…' : session ? 'Upgrade to PRO' : 'Start free trial'}
            </button>
          </div>
        </div>
        <p className="text-center text-sm text-[var(--text-muted)] mt-8">All plans include a 7-day free trial. No credit card required to start.</p>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { session } = useAuth();
  const [automationCount, setAutomationCount] = useState<number | null>(null);
  const [activePain, setActivePain] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (hash.includes('error=access_denied') || hash.includes('otp_expired') || hash.includes('Email+link+is+invalid')) {
      router.replace('/auth/verify-email');
    }
  }, [router]);

  useEffect(() => {
    supabase.from('automations').select('id', { count: 'exact', head: true }).eq('active', true)
      .then(({ count }) => { if (count) setAutomationCount(count); });
  }, []);

  // Cycle through pain points
  useEffect(() => {
    const interval = setInterval(() => setActivePain(i => (i + 1) % PAIN_POINTS.length), 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <ExitIntentPopup />

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-md" style={{ background: 'rgba(10,10,10,0.85)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-white text-lg tracking-tight">
            <span className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm font-black">V</span>
            VelocityApps
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-white/60">
            <Link href="/marketplace" className="hover:text-white transition-colors">Automations</Link>
            <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
            {session
              ? <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              : <Link href="/auth/sign-in" className="hover:text-white transition-colors">Sign in</Link>
            }
          </div>
          <Link
            href={session ? '/dashboard' : '/onboarding'}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20"
          >
            {session ? 'Dashboard' : 'Start free trial'}
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #060d1f 0%, #0d1f40 50%, #060d1f 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 right-0 w-[700px] h-[700px] rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 60%)' }} />
          <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-8 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {automationCount ?? '14'}+ automations live now
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
                Your Shopify store,<br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #60a5fa, #818cf8)' }}>
                  running itself.
                </span>
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-lg">
                Pre-built automations that recover carts, send review requests, alert on low stock, and win back customers — all running 24/7 without you touching a thing.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Link href="/onboarding"
                  className="px-7 py-3.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold text-base transition-colors shadow-xl shadow-blue-500/30 text-center">
                  Start free — 7 day trial
                </Link>
                <Link href="/marketplace"
                  className="px-7 py-3.5 bg-white/8 hover:bg-white/15 border border-white/15 text-white rounded-xl font-semibold text-base transition-colors text-center">
                  Browse automations
                </Link>
              </div>

              <p className="text-sm text-slate-500">No credit card required · Cancel anytime · Installed in 60 seconds</p>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 mt-10 pt-10 border-t border-white/10">
                {[
                  { value: 'Up to 15%', label: 'carts recovered' },
                  { value: '3×', label: 'more reviews' },
                  { value: '5 hrs', label: 'saved per week' },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <div className="text-2xl font-extrabold text-blue-400 mb-0.5">{value}</div>
                    <div className="text-xs text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — live feed */}
            <div className="lg:pl-8">
              <LiveFeed />
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof bar ──────────────────────────────────────────────── */}
      <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-8">
            Trusted by Shopify merchants worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-40">
            {/* Placeholder brand logos — replace with real SVGs when available */}
            {['BRAND', 'STORE CO', 'SHOPIFY+', 'FASHION HQ', 'TECH GOODS', 'NORDIC CO'].map(name => (
              <div key={name} className="text-[var(--text-primary)] text-sm font-black tracking-tight">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pain points ───────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] mb-3">The work you're not doing</h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">Every one of these is costing you money right now. Here's how we fix it.</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-4 mb-8">
            {PAIN_POINTS.map((p, i) => (
              <button
                key={i}
                onClick={() => setActivePain(i)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 ${activePain === i
                  ? 'bg-blue-500/15 border-blue-400/40 text-[var(--text-primary)]'
                  : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30'
                  }`}
              >
                <span className="text-2xl mb-2 block">{p.icon}</span>
                <p className="text-xs font-semibold leading-snug">{p.problem}</p>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-8 lg:p-10">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{PAIN_POINTS[activePain].icon}</span>
                  <span className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">The problem</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-4 leading-snug">
                  {PAIN_POINTS[activePain].problem}
                </h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">{PAIN_POINTS[activePain].solution}</p>
              </div>
              <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-6">
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Solved by</div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{PAIN_POINTS[activePain].icon}</span>
                  <span className="font-bold text-[var(--text-primary)]">{PAIN_POINTS[activePain].automation}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-500 font-semibold mb-5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {PAIN_POINTS[activePain].metric}
                </div>
                <Link
                  href="/marketplace"
                  className="block w-full py-2.5 text-center bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Start 7-day free trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--bg-secondary)] border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] mb-3">Up and running in 60 seconds</h2>
            <p className="text-[var(--text-secondary)] text-lg">No code. No setup. No waiting.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            {/* Connector line — desktop only */}
            <div className="hidden sm:block absolute top-10 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

            {[
              { step: '01', title: 'Install the app', desc: 'Connect your Shopify store in one click. OAuth takes 15 seconds.', icon: '🔌' },
              { step: '02', title: 'Activate an automation', desc: 'Browse the marketplace, pick what you need, start your free trial.', icon: '⚡' },
              { step: '03', title: 'Watch it work', desc: 'Your automation runs 24/7. Check the live logs and watch the results come in.', icon: '📈' },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="relative bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-7 text-center">
                <div className="text-3xl mb-4">{icon}</div>
                <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">{step}</div>
                <h3 className="font-bold text-[var(--text-primary)] text-lg mb-2">{title}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Automation grid ───────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] mb-3">Popular automations</h2>
            <p className="text-[var(--text-secondary)] text-lg">Most stores see results within the first week.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {AUTOMATIONS.map((a) => (
              <Link
                key={a.name}
                href={`/automations/${a.slug}`}
                className="group flex items-center gap-4 p-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl hover:border-blue-500/40 hover:bg-[var(--bg-secondary)] transition-all"
              >
                <div className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform">{a.icon}</div>
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text-primary)] text-sm leading-snug">{a.name}</div>
                  <div className="text-xs text-green-500 font-medium mt-0.5">{a.roi}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{a.category} · from ${a.price}/mo</div>
                </div>
                <svg className="w-4 h-4 text-[var(--text-muted)] ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link href="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
              View all {automationCount ?? '14'}+ automations
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── ROI Calculator ────────────────────────────────────────────────── */}
      <RoiCalculator />

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] mb-3">Everything you need, nothing you don't</h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
              Built to be reliable, transparent, and easy to use — because that's what Shopify merchants actually need.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 hover:border-blue-500/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <div id="pricing">
        <PricingSection session={session} />
      </div>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28" style={{ background: 'linear-gradient(135deg, #060d1f 0%, #0d1f40 60%, #060d1f 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-25"
            style={{ background: 'radial-gradient(ellipse, #3b82f6 0%, transparent 65%)' }} />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Stop losing money<br />to abandoned carts.
          </h2>
          <p className="text-slate-300 text-xl mb-10 max-w-xl mx-auto">
            Start your 7-day free trial. No credit card required. Your first automation running in under a minute.
          </p>
          <Link
            href={session ? '/dashboard' : '/onboarding'}
            className="inline-block px-10 py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold text-lg transition-colors shadow-2xl shadow-blue-500/30"
          >
            {session ? 'Go to Dashboard' : 'Get started free →'}
          </Link>
          <p className="text-slate-500 text-sm mt-4">No credit card · Cancel anytime · Shopify approved</p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-base mb-3">
                <span className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center text-white text-xs font-black">V</span>
                VelocityApps
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">Pre-built Shopify automations that run your store for you. No code required.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
                <li><Link href="/marketplace" className="hover:text-[var(--text-primary)] transition-colors">Automations</Link></li>
                <li><Link href="/#pricing" className="hover:text-[var(--text-primary)] transition-colors">Pricing</Link></li>
                <li><Link href="/onboarding" className="hover:text-[var(--text-primary)] transition-colors">Get started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
                <li><Link href="/support" className="hover:text-[var(--text-primary)] transition-colors">Support</Link></li>
                <li><Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Account</h4>
              <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
                {session
                  ? <li><Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link></li>
                  : <>
                    <li><Link href="/auth/sign-in" className="hover:text-[var(--text-primary)] transition-colors">Sign in</Link></li>
                    <li><Link href="/onboarding" className="hover:text-[var(--text-primary)] transition-colors">Create account</Link></li>
                  </>
                }
              </ul>
            </div>
          </div>
          <div className="border-t border-[var(--border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-muted)]">© {new Date().getFullYear()} VelocityApps. All rights reserved.</p>
            <p className="text-xs text-[var(--text-muted)]">Built for Shopify merchants · velocityapps.dev</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
