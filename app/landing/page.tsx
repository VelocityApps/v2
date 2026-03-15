'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

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

const AUTOMATIONS = [
  { icon: '🛒', name: 'Abandoned Cart Recovery', category: 'Revenue', price: 29 },
  { icon: '⭐', name: 'Review Request Automator', category: 'Social proof', price: 19 },
  { icon: '📦', name: 'Low Stock Alerts', category: 'Inventory', price: 34 },
  { icon: '🏆', name: 'Best Sellers Collection', category: 'Merchandising', price: 15 },
  { icon: '✉️', name: 'Welcome Email Series', category: 'Retention', price: 24 },
  { icon: '🔁', name: 'Win-Back Campaign', category: 'Retention', price: 29 },
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

function PricingSection({ session }: { session: any }) {
  const [annual, setAnnual] = useState(false);

  const monthlyPrice = 79;
  const annualMonthly = 59;
  const annualTotal = annualMonthly * 12;

  return (
    <section className="bg-[#f6f6f7] border-y border-[#e1e3e5] py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#202223] mb-3">Simple, transparent pricing</h2>
          <p className="text-[#6d7175] text-lg">Pay per automation, or go PRO for everything.</p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 mt-8 bg-white border border-[#e1e3e5] rounded-lg p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!annual ? 'bg-[#2563eb] text-white shadow-sm' : 'text-[#6d7175] hover:text-[#202223]'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${annual ? 'bg-[#2563eb] text-white shadow-sm' : 'text-[#6d7175] hover:text-[#202223]'}`}
            >
              Annual
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${annual ? 'bg-white/20 text-white' : 'bg-[#e3f9e3] text-[#008060]'}`}>
                Save 25%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Pay-per-automation */}
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-8">
            <h3 className="text-lg font-bold text-[#202223] mb-1">Starter</h3>
            <p className="text-sm text-[#6d7175] mb-6">Pick only what you need.</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-[#202223]">£15</span>
              <span className="text-[#6d7175] ml-1">/ automation / mo</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                'Choose individual automations',
                '7-day free trial per automation',
                'Cancel any automation anytime',
                'Standard support (< 4 hr)',
                'Live execution logs',
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-[#202223]">
                  <svg className="w-4 h-4 text-[#008060] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/marketplace"
              className="block w-full py-3 text-center border border-[#e1e3e5] rounded-lg text-sm font-semibold text-[#202223] hover:bg-[#f6f6f7] transition-colors"
            >
              Browse automations
            </Link>
          </div>

          {/* PRO */}
          <div className="bg-[#2563eb] rounded-xl p-8 relative overflow-hidden">
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
            {annual && (
              <p className="text-blue-200 text-sm mb-6">Billed £{annualTotal} annually</p>
            )}
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
            <Link
              href={session ? '/dashboard' : '/onboarding'}
              className="block w-full py-3 text-center bg-white text-[#2563eb] rounded-lg text-sm font-semibold hover:bg-[#f0f7ff] transition-colors shadow-sm"
            >
              {session ? 'Upgrade to PRO' : 'Start free trial'}
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-[#8c9196] mt-8">
          All plans include a 7-day free trial. No credit card required to start.
        </p>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [automationCount, setAutomationCount] = useState<number | null>(null);

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
    <div className="bg-white text-[#202223]">

      {/* ── Hero ── */}
      <section className="bg-[#f6f6f7] border-b border-[#e1e3e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e8f0fe] text-[#2563eb] text-xs font-semibold mb-8 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></span>
              Built for Shopify merchants
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold text-[#202223] leading-tight tracking-tight mb-6">
              Shopify automations<br />
              <span className="text-[#2563eb]">that just work.</span>
            </h1>

            <p className="text-xl text-[#6d7175] leading-relaxed mb-10 max-w-2xl mx-auto">
              Browse {automationCount ?? '15'}+ pre-built automations for your store. Abandoned cart recovery, review requests,
              low stock alerts, and more — installed in seconds. No code, no setup.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <Link
                href="/marketplace"
                className="px-7 py-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold text-base transition-colors shadow-sm"
              >
                Browse automations
              </Link>
              {session ? (
                <Link
                  href="/dashboard"
                  className="px-7 py-3.5 bg-white hover:bg-[#f6f6f7] border border-[#e1e3e5] text-[#202223] rounded-lg font-semibold text-base transition-colors"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  href="/onboarding"
                  className="px-7 py-3.5 bg-white hover:bg-[#f6f6f7] border border-[#e1e3e5] text-[#202223] rounded-lg font-semibold text-base transition-colors"
                >
                  Start free trial
                </Link>
              )}
            </div>

            <p className="text-sm text-[#8c9196]">
              7-day free trial · No credit card required · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-b border-[#e1e3e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: `${automationCount ?? '15'}+`, label: 'Automations' },
              { value: '99.9%', label: 'Uptime' },
              { value: '< 4h', label: 'Support response' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-extrabold text-[#2563eb] mb-1">{value}</div>
                <div className="text-sm text-[#6d7175]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Automation grid ── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#202223] mb-3">Popular automations</h2>
            <p className="text-[#6d7175] text-lg">Start with these — most stores see results within the first week.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {AUTOMATIONS.map((a) => (
              <div
                key={a.name}
                className="flex items-center gap-4 p-5 bg-white border border-[#e1e3e5] rounded-xl hover:border-[#2563eb]/40 hover:shadow-sm transition-all"
              >
                <div className="text-3xl flex-shrink-0">{a.icon}</div>
                <div className="min-w-0">
                  <div className="font-semibold text-[#202223] text-sm leading-snug">{a.name}</div>
                  <div className="text-xs text-[#6d7175] mt-0.5">{a.category} · from £{a.price}/mo</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[#e1e3e5] rounded-lg text-sm font-medium text-[#202223] hover:bg-[#f6f6f7] transition-colors"
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
      <section className="bg-[#f6f6f7] border-y border-[#e1e3e5] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[#202223] mb-3">Everything you need, nothing you don't</h2>
            <p className="text-[#6d7175] text-lg max-w-2xl mx-auto">
              Built to be reliable, transparent, and easy to use — because that's what Shopify merchants actually need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-[#e1e3e5] rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-[#e8f0fe] text-[#2563eb] flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-[#202223] mb-2">{f.title}</h3>
                <p className="text-[#6d7175] text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#202223] mb-3">Up and running in 3 steps</h2>
          </div>
          <div className="space-y-6">
            {[
              { step: '1', title: 'Create your account', desc: 'Sign up free — no credit card required.' },
              { step: '2', title: 'Connect your Shopify store', desc: 'OAuth in one click. We request only the permissions each automation needs.' },
              { step: '3', title: 'Install an automation', desc: 'Browse the marketplace, start a free trial, and the automation runs immediately.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5 items-start">
                <div className="w-9 h-9 rounded-full bg-[#2563eb] text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-[#202223] mb-1">{title}</h3>
                  <p className="text-[#6d7175] text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection session={session} />

      {/* ── CTA ── */}
      <section className="bg-[#2563eb] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to automate your store?
          </h2>
          <p className="text-blue-200 text-lg mb-8">
            Start your 7-day free trial today. No credit card required.
          </p>
          <Link
            href={session ? '/dashboard' : '/onboarding'}
            className="inline-block px-8 py-4 bg-white text-[#2563eb] rounded-lg font-semibold text-base hover:bg-[#f0f7ff] transition-colors shadow-sm"
          >
            {session ? 'Go to Dashboard' : 'Get started free'}
          </Link>
        </div>
      </section>

    </div>
  );
}
