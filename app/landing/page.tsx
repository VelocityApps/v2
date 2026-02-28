'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AutomationCard from '@/components/automations/AutomationCard';
import VelocityLogo from '@/components/VelocityLogo';

export default function LandingPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [topAutomations, setTopAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // If Supabase redirects here with expired/invalid email link, send to verify-email page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (hash.includes('error=access_denied') || hash.includes('otp_expired') || hash.includes('Email+link+is+invalid')) {
      router.replace('/auth/verify-email');
    }
  }, [router]);

  useEffect(() => {
    async function fetchTopAutomations() {
      try {
        const { data, error } = await supabase
          .from('automations')
          .select('*')
          .eq('active', true)
          .order('user_count', { ascending: false })
          .limit(3);

        if (!error) {
          setTopAutomations(data || []);
        }
      } catch (error) {
        console.error('Error fetching automations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTopAutomations();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <VelocityLogo iconSize={96} layout="column" textClassName="text-5xl font-black" />
            </div>

            {/* Hero Text */}
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] bg-clip-text text-transparent">
              Shopify Automations That Just Work
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto">
              Stop wasting time on manual tasks. Browse 20+ pre-built automations for your Shopify store. 
              No code, no deployment, just works.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                href="/marketplace"
                className="px-8 py-4 bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-[#3b82f6]/30 hover:shadow-[#3b82f6]/50 hover:scale-105"
              >
                Browse All Automations →
              </Link>
              {!session && (
                <Link
                  href="/onboarding"
                  className="px-8 py-4 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white rounded-xl font-semibold text-lg transition-all"
                >
                  Get Started Free
                </Link>
              )}
              {session && (
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white rounded-xl font-semibold text-lg transition-all"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>

            {/* Social Proof */}
            <div className="text-gray-500 text-sm">
              Join <span className="text-[#3b82f6] font-semibold">1,234+</span> Shopify stores using VelocityApps
            </div>
          </div>
        </div>
      </div>

      {/* Top Automations Showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Most Popular Automations</h2>
          <p className="text-gray-400 text-lg">
            Start with these proven automations trusted by hundreds of stores
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066cc] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading automations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {topAutomations.map((automation: any) => (
              <AutomationCard
                key={automation.id}
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
                variant="marketplace"
              />
            ))}
          </div>
        )}

        <div className="text-center">
          <Link
            href="/marketplace"
            className="inline-block px-6 py-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white rounded-lg font-medium transition-colors"
          >
            View All Automations
          </Link>
        </div>
      </div>

      {/* What Makes Us Different Section */}
      <div className="bg-[#1a1a1a] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Makes Us Different</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              We built VelocityApps because we were tired of broken Shopify apps. Here's how we're different:
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-6">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2 text-white">One-Click Install</h3>
              <p className="text-gray-400 mb-4">
                Connect your store and install automations in seconds. No technical setup required.
              </p>
              <div className="text-sm text-gray-500">
                <span className="line-through">15-step setup</span> → <span className="text-green-400">3 clicks</span>
              </div>
            </div>
            
            <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-6">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2 text-white">Support That Actually Responds</h3>
              <p className="text-gray-400 mb-4">
                Get help in hours, not weeks. Personal responses, not generic templates.
              </p>
              <div className="text-sm text-gray-500">
                <span className="line-through">2-7 day response</span> → <span className="text-green-400">&lt;2 hour response</span>
              </div>
            </div>
            
            <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-6">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2 text-white">It Actually Works</h3>
              <p className="text-gray-400 mb-4">
                98% uptime, monitored 24/7. We never break your store.
              </p>
              <div className="text-sm text-gray-500">
                <span className="line-through">Breaks after 2 months</span> → <span className="text-green-400">Reliable & monitored</span>
              </div>
            </div>
            
            <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2 text-white">Transparent Results</h3>
              <p className="text-gray-400 mb-4">
                See real conversion rates and success metrics. No hiding failures.
              </p>
              <div className="text-sm text-gray-500">
                <span className="line-through">Hidden metrics</span> → <span className="text-green-400">Public results</span>
              </div>
            </div>
            
            <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-6">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2 text-white">Fair Pricing</h3>
              <p className="text-gray-400 mb-4">
                Clear pricing, no surprise upgrades. Grandfather existing users.
              </p>
              <div className="text-sm text-gray-500">
                <span className="line-through">$200/month surprise</span> → <span className="text-green-400">Clear, fair pricing</span>
              </div>
            </div>
            
            <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-6">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold mb-2 text-white">Simple & Reliable</h3>
              <p className="text-gray-400 mb-4">
                Works out of the box. No complicated setup, no broken tutorials.
              </p>
              <div className="text-sm text-gray-500">
                <span className="line-through">15-step setup</span> → <span className="text-green-400">Works immediately</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">One-Click Install</h3>
              <p className="text-gray-400">
                Connect your store and install automations in seconds. No technical setup required.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-gray-400">
                Enterprise-grade security. Your data stays safe with encrypted connections and secure storage.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">Fair Pricing</h3>
              <p className="text-gray-400">
                Pay only for what you use. £19-39/month per automation. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Ready to Automate Your Store?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join hundreds of Shopify stores saving hours every week with VelocityApps automations.
          </p>
          <Link
            href={session ? "/dashboard" : "/onboarding"}
            className="inline-block px-8 py-4 bg-white text-[#3b82f6] rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
}

