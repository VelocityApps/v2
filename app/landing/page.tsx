'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const AUTOMATIONS = [
  { icon: '🛒', name: 'Abandoned Cart Recovery', category: 'Revenue', price: 29, roi: 'Recover up to 15% of abandoned carts' },
  { icon: '⭐', name: 'Review Request Automator', category: 'Social proof', price: 19, roi: 'Get 3× more reviews on autopilot' },
  { icon: '📦', name: 'Low Stock Alerts', category: 'Inventory', price: 34, roi: 'Save ~5 hrs/week on stock checks' },
  { icon: '🏆', name: 'Best Sellers Collection', category: 'Merchandising', price: 15, roi: 'Keep top sellers front and centre' },
  { icon: '✉️', name: 'Welcome Email Series', category: 'Retention', price: 24, roi: 'Convert new subscribers 22% better' },
  { icon: '🔁', name: 'Win-Back Campaign', category: 'Retention', price: 29, roi: 'Win back 1 in 5 lapsed customers' },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'One-click install',
    description: 'Connect your Shopify store and install any automation in under 60 seconds. No developer needed.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure by default',
    description: 'AES-256 encrypted tokens, RLS-protected data, and SOC 2-aligned infrastructure. Your store data is safe.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: 'Pay per automation',
    description: 'Subscribe to only the automations you need. Cancel any individual one at any time.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Real support',
    description: 'Email and in-app support with a 4-hour response guarantee. Talk to a human, not a bot.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Live execution logs',
    description: 'See exactly what each automation did, when it ran, and why — with full audit logs.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: 'Runs automatically',
    description: 'Webhook-driven and cron-scheduled. Your automations run 24/7 without you lifting a finger.',
  },
];

function RoiCalculator() {
  const [revenue, setRevenue] = useState(10000);
  const [aov, setAov] = useState(50);

  const monthlyOrders = Math.round(revenue / aov);
  const abandonedCarts = Math.round(monthlyOrders * 0.70);
  const recoveredCarts = Math.round(abandonedCarts * 0.10);
  const cartRecoveryValue = recoveredCarts * aov;

  const extraReviews = Math.round(monthlyOrders * 0.30);

  const stockHoursSaved = Math.min(Math.round(monthlyOrders / 50), 8);

  const annualValue = cartRecoveryValue * 12;
  const annualCost = (29 + 19 + 34) * 12; // cart + reviews + stock
  const annualROI = annualValue - annualCost;

  const fmt = (n: number) =>
    n >= 1000 ? `£${(n / 1000).toFixed(1)}k` : `£${n}`;

  return (
    <section className="py-20 border-b border-[var(--border)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">What could you recover?</h2>
          <p className="text-[var(--text-secondary)] text-lg">Enter your store numbers — see what automation is worth to you.</p>
        </div>

        {/* Inputs */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold text-[var(--text-primary)]">Monthly revenue</label>
                <span className="text-sm font-bold text-[var(--accent)]">{fmt(revenue)}</span>
              </div>
              <input
                type="range" min={1000} max={200000} step={1000}
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>£1k</span><span>£200k</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold text-[var(--text-primary)]">Average order value</label>
                <span className="text-sm font-bold text-[var(--accent)]">£{aov}</span>
              </div>
              <input
                type="range" min={10} max={500} step={5}
                value={aov}
                onChange={(e) => setAov(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>£10</span><span>£500</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-6">
            <div className="text-2xl mb-2">🛒</div>
            <div className="text-2xl font-extrabold text-[var(--text-primary)] mb-1">{fmt(cartRecoveryValue)}<span className="text-base font-normal text-[var(--text-secondary)]">/mo</span></div>
            <div className="text-sm font-medium text-[var(--text-primary)] mb-1">Abandoned Cart Recovery</div>
            <div className="text-xs text-[var(--text-secondary)]">{recoveredCarts} of {abandonedCarts} abandoned carts recovered</div>
          </div>

          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-6">
            <div className="text-2xl mb-2">⭐</div>
            <div className="text-2xl font-extrabold text-[var(--text-primary)] mb-1">+{extraReviews}<span className="text-base font-normal text-[var(--text-secondary)]">/mo</span></div>
            <div className="text-sm font-medium text-[var(--text-primary)] mb-1">Extra Reviews</div>
            <div className="text-xs text-[var(--text-secondary)]">From {monthlyOrders} monthly orders</div>
          </div>

          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-6">
            <div className="text-2xl mb-2">⏱️</div>
            <div className="text-2xl font-extrabold text-[var(--text-primary)] mb-1">{stockHoursSaved} hrs<span className="text-base font-normal text-[var(--text-secondary)]">/wk</span></div>
            <div className="text-sm font-medium text-[var(--text-primary)] mb-1">Time Saved</div>
            <div className="text-xs text-[var(--text-secondary)]">On manual inventory checks</div>
          </div>
        </div>

        {/* Summary banner */}
        <div className="rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 100%)' }}>
          <div>
            <p className="text-white font-semibold text-lg">Estimated annual return: <span className="text-blue-400 font-extrabold">{fmt(annualROI)}</span></p>
            <p className="text-slate-400 text-sm mt-0.5">After automation costs · Based on conservative industry benchmarks</p>
          </div>
          <Link
            href="/onboarding"
            className="flex-shrink-0 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-blue-500/30 whitespace-nowrap"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </section>
  );
}

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

function PricingSection({ session }: { session: any }) {
  const [annual, setAnnual] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  async function handleUpgrade() {
    if (!session) {
      window.location.href = '/onboarding';
      return;
    }
    setUpgrading(true);
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planType: 'pro' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setUpgrading(false);
    }
  }

  const monthlyPrice = 79;
  const annualMonthly = 59;
  const annualTotal = annualMonthly * 12;

  return (
    <section className="bg-[var(--bg-secondary)] border-y border-[var(--border)] py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">Simple, transparent pricing</h2>
          <p className="text-[var(--text-secondary)] text-lg">Pay per automation, or go PRO for everything.</p>

          <div className="inline-flex items-center gap-3 mt-8 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!annual ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${annual ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Annual
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${annual ? 'bg-white/20 text-white' : 'bg-[var(--success-bg)] text-[var(--success)]'}`}>
                Save 25%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Pay-per-automation */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-8">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Starter</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Pick only what you need.</p>
            <div className="mb-4">
              <span className="text-4xl font-extrabold text-[var(--text-primary)]">from £15</span>
              <span className="text-[var(--text-secondary)] ml-1">/ automation / mo</span>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[
                ['Best Sellers Collection', '£15'],
                ['Review Request Automator', '£19'],
                ['Welcome Email Series', '£24'],
                ['Abandoned Cart Recovery', '£29'],
                ['Low Stock Alerts', '£34'],
              ].map(([name, price]) => (
                <div key={name} className="flex items-center justify-between text-xs text-[var(--text-secondary)] col-span-2 border-b border-[var(--border)] py-1 last:border-0">
                  <span>{name}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{price}/mo</span>
                </div>
              ))}
            </div>
            <ul className="space-y-3 mb-8">
              {[
                'Choose individual automations',
                '7-day free trial per automation',
                'Cancel any automation anytime',
                'Standard support (< 4 hr)',
                'Live execution logs',
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-[var(--text-primary)]">
                  <svg className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/marketplace"
              className="block w-full py-3 text-center border border-[var(--border)] rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Browse automations
            </Link>
          </div>

          {/* PRO */}
          <div className="bg-[var(--accent)] rounded-xl p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4 px-2.5 py-1 bg-white/20 rounded-md text-white text-xs font-semibold">
              Most popular
            </div>
            <h3 className="text-lg font-bold text-white mb-1">PRO</h3>
            <p className="text-sm text-blue-200 mb-6">Everything, for one flat price.</p>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-white">
                £{annual ? annualMonthly : monthlyPrice}
              </span>
              <span className="text-blue-200 ml-1">/ mo</span>
            </div>
            {annual && <p className="text-blue-200 text-sm mb-6">Billed £{annualTotal} annually</p>}
            {!annual && <p className="text-blue-200 text-sm mb-6">Billed monthly, cancel anytime</p>}
            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-white">
                  <svg className="w-4 h-4 text-white/70 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="block w-full py-3 text-center bg-white text-[var(--accent)] rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-60"
            >
              {upgrading ? 'Redirecting…' : session ? 'Upgrade to PRO' : 'Start free trial'}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-[var(--text-muted)] mt-8">
          All plans include a 7-day free trial. No credit card required to start.
        </p>
      </div>
    </section>
  );
}

const HERO_LINES = [
  'Save 5 hours a week.',
  'Recover abandoned carts.',
  'Get 3× more reviews.',
  'Win back lapsed customers.',
  'Never miss a low stock alert.',
];

export default function LandingPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [automationCount, setAutomationCount] = useState<number | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroVisible(false);
      setTimeout(() => {
        setHeroIndex((i) => (i + 1) % HERO_LINES.length);
        setHeroVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)]">

      {/* ── Hero ── dark, striking */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0f172a 100%)' }}>
        {/* Decorative glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 right-0 w-[700px] h-[700px] rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 65%)' }} />
          <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-8 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Built for Shopify merchants
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
              Your Shopify store,
              <span
                className="text-blue-400 transition-opacity duration-300"
                style={{ opacity: heroVisible ? 1 : 0, display: 'block', minHeight: '1.25em' }}
              >
                {HERO_LINES[heroIndex]}
              </span>
              On autopilot.
            </h1>

            <p className="text-xl text-slate-300 leading-relaxed mb-10 max-w-2xl mx-auto">
              {automationCount ?? '14'}+ pre-built automations that run your Shopify store automatically —
              abandoned cart recovery, low stock alerts, review requests, and more. Installed in 60 seconds. No code.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <Link
                href="/marketplace"
                className="px-7 py-3.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-semibold text-base transition-colors shadow-lg shadow-blue-500/30"
              >
                Browse automations
              </Link>
              {session ? (
                <Link
                  href="/dashboard"
                  className="px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-semibold text-base transition-colors backdrop-blur-sm"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  href="/onboarding"
                  className="px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-semibold text-base transition-colors backdrop-blur-sm"
                >
                  Start free trial
                </Link>
              )}
            </div>

            <p className="text-sm text-slate-400">
              7-day free trial · No credit card required · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: 'Up to 15%', label: 'of abandoned carts recovered' },
              { value: '5 hrs', label: 'saved per week on inventory' },
              { value: '< 4h', label: 'Support response' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-extrabold text-[var(--accent)] mb-1">{value}</div>
                <div className="text-sm text-[var(--text-secondary)]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── ROI Calculator ── */}
      <RoiCalculator />

      {/* ── Automation grid ── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">Popular automations</h2>
            <p className="text-[var(--text-secondary)] text-lg">Start with these — most stores see results within the first week.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {AUTOMATIONS.map((a) => (
              <div
                key={a.name}
                className="flex items-center gap-4 p-5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/40 hover:shadow-sm transition-all"
              >
                <div className="text-3xl flex-shrink-0">{a.icon}</div>
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text-primary)] text-sm leading-snug">{a.name}</div>
                  <div className="text-xs text-[var(--success)] font-medium mt-0.5">{a.roi}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">{a.category} · from £{a.price}/mo</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              View all automations
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-[var(--bg-secondary)] border-y border-[var(--border)] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">Everything you need, nothing you don't</h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
              Built to be reliable, transparent, and easy to use — because that's what Shopify merchants actually need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-bg)] text-[var(--accent)] flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">Up and running in 3 steps</h2>
          </div>
          <div className="space-y-6">
            {[
              { step: '1', title: 'Create your account', desc: 'Sign up free — no credit card required.' },
              { step: '2', title: 'Connect your Shopify store', desc: 'OAuth in one click. We request only the permissions each automation needs.' },
              { step: '3', title: 'Install an automation', desc: 'Browse the marketplace, start a free trial, and the automation runs immediately.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5 items-start">
                <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
                  <p className="text-[var(--text-secondary)] text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection session={session} />

      {/* ── CTA ── */}
      <section className="relative overflow-hidden py-20" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Stop leaving money on the table.
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            Every abandoned cart you're not recovering is revenue lost. Start your 7-day free trial — no credit card required.
          </p>
          <Link
            href={session ? '/dashboard' : '/onboarding'}
            className="inline-block px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-semibold text-base transition-colors shadow-lg shadow-blue-500/30"
          >
            {session ? 'Go to Dashboard' : 'Get started free'}
          </Link>
        </div>
      </section>

    </div>
  );
}
