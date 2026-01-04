'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/contexts/AuthContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: 'free' | 'pro' | 'teams' | 'cancelled';
  planType?: 'pro' | 'teams';
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 
  process.env.NEXT_PUBLIC_STRIPE_KEY || 
  ''
);

export default function UpgradeModal({ isOpen, onClose, currentPlan, planType = 'pro' }: UpgradeModalProps) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!session) {
      setError('Please sign in to upgrade');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: planType, // 'pro' or 'teams'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error: stripeError } = await (stripe as any).redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw stripeError;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            Upgrade to {planType === 'teams' ? 'Teams' : 'Pro'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Pricing Comparison */}
          <div className={`grid gap-4 ${planType === 'teams' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {/* Free Plan */}
            <div className={`p-4 rounded-lg border-2 ${
              currentPlan === 'free' 
                ? 'border-[#ff6b35] bg-[#ff6b35]/10' 
                : 'border-[#333] bg-[#0a0a0a]'
            }`}>
              <div className="text-sm font-semibold text-gray-400 mb-2">FREE</div>
              <div className="text-2xl font-bold text-white mb-1">$0</div>
              <div className="text-xs text-gray-500 mb-4">per month</div>
              <ul className="space-y-2 text-xs text-gray-400">
                <li>✓ 10 credits/month</li>
                <li>✓ 3 projects</li>
                <li>✓ Basic support</li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className={`p-4 rounded-lg border-2 ${
              currentPlan === 'pro' 
                ? 'border-[#ff6b35] bg-[#ff6b35]/10' 
                : planType === 'pro'
                ? 'border-[#ff6b35] bg-[#0a0a0a]'
                : 'border-[#333] bg-[#0a0a0a]'
            }`}>
              <div className="text-sm font-semibold text-[#ff6b35] mb-2">PRO</div>
              <div className="text-2xl font-bold text-white mb-1">$29</div>
              <div className="text-xs text-gray-500 mb-4">per month</div>
              <ul className="space-y-2 text-xs text-gray-400">
                <li>✓ 500 credits/month</li>
                <li>✓ Unlimited projects</li>
                <li>✓ Priority support</li>
                <li>✓ All templates</li>
              </ul>
            </div>

            {/* Teams Plan */}
            {planType === 'teams' && (
              <div className={`p-4 rounded-lg border-2 ${
                currentPlan === 'teams' 
                  ? 'border-[#ff6b35] bg-[#ff6b35]/10' 
                  : 'border-[#ff6b35] bg-[#0a0a0a]'
              }`}>
                <div className="text-sm font-semibold text-[#ff6b35] mb-2">TEAMS</div>
                <div className="text-2xl font-bold text-white mb-1">$99</div>
                <div className="text-xs text-gray-500 mb-4">per month</div>
                <ul className="space-y-2 text-xs text-gray-400">
                  <li>✓ 2000 credits/month</li>
                  <li>✓ Unlimited projects</li>
                  <li>✓ Team collaboration</li>
                  <li>✓ Priority support</li>
                  <li>✓ All templates</li>
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-900/30 text-red-300 text-sm border border-red-500/50">
              {error}
            </div>
          )}

          {currentPlan === 'free' ? (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full px-6 py-3 bg-[#ff6b35] hover:bg-[#ff7b45] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Processing...</span>
                </>
              ) : (
                `Upgrade to ${planType === 'teams' ? 'Teams' : 'Pro'} - $${planType === 'teams' ? '99' : '29'}/month`
              )}
            </button>
          ) : currentPlan === 'pro' && planType === 'teams' ? (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full px-6 py-3 bg-[#ff6b35] hover:bg-[#ff7b45] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Processing...</span>
                </>
              ) : (
                'Upgrade to Teams - $99/month'
              )}
            </button>
          ) : (
            <div className="text-center text-sm text-gray-400">
              You're already on the {currentPlan === 'teams' ? 'Teams' : 'Pro'} plan!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

