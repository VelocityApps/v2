'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AutomationCard from '@/components/automations/AutomationCard';

export default function LandingPage() {
  const { user, session } = useAuth();
  const [topAutomations, setTopAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
              <div className="flex items-center gap-4">
                {/* Logo Graphic - Stylized V with Arrow */}
                <div className="relative w-20 h-20">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Three parallel vertical lines (V left side) */}
                    <line x1="10" y1="10" x2="10" y2="50" stroke="#0a2463" strokeWidth="4" strokeLinecap="round"/>
                    <line x1="15" y1="10" x2="15" y2="50" stroke="#0a2463" strokeWidth="4" strokeLinecap="round"/>
                    <line x1="20" y1="10" x2="20" y2="50" stroke="#0a2463" strokeWidth="4" strokeLinecap="round"/>
                    
                    {/* Arrow (V right side) - diagonal upward */}
                    <path d="M25 50 L40 10 L55 50" stroke="#0066cc" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M40 10 L40 50" stroke="#0066cc" strokeWidth="4" strokeLinecap="round"/>
                    
                    {/* Arrowhead */}
                    <polygon points="40,10 35,18 45,18" fill="#0066cc"/>
                    
                    {/* Speed lines */}
                    <line x1="35" y1="25" x2="48" y2="25" stroke="#0066cc" strokeWidth="2.5" strokeLinecap="round" opacity="0.8"/>
                    <line x1="37" y1="32" x2="45" y2="32" stroke="#0066cc" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
                    <line x1="39" y1="38" x2="43" y2="38" stroke="#0066cc" strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
                  </svg>
                </div>
                {/* Logo Text */}
                <div className="text-5xl font-bold">
                  <span className="text-[#0a2463]">Velocity</span><span className="text-[#3498db]">Apps</span>
                </div>
              </div>
            </div>

            {/* Hero Text */}
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#0a2463] to-[#3498db] bg-clip-text text-transparent">
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
                className="px-8 py-4 bg-gradient-to-r from-[#0066cc] to-[#3498db] hover:from-[#0052a3] hover:to-[#2980b9] text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-[#0066cc]/30 hover:shadow-[#0066cc]/50 hover:scale-105"
              >
                Browse All Automations →
              </Link>
              {!session && (
                <Link
                  href="/onboarding"
                  className="px-8 py-4 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white rounded-xl font-semibold text-lg transition-all"
                >
                  Get Started Free
                </Link>
              )}
              {session && (
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white rounded-xl font-semibold text-lg transition-all"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>

            {/* Social Proof */}
            <div className="text-gray-500 text-sm">
              Join <span className="text-[#0066cc] font-semibold">1,234+</span> Shopify stores using VelocityApps
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

      {/* Features Section */}
      <div className="bg-[#1a1a1a] py-16">
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
        <div className="bg-gradient-to-r from-[#0066cc] to-[#3498db] rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Automate Your Store?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join hundreds of Shopify stores saving hours every week with VelocityApps automations.
          </p>
          <Link
            href={session ? "/dashboard" : "/onboarding"}
            className="inline-block px-8 py-4 bg-white text-[#0066cc] rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
}

