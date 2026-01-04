'use client';

import { useState } from 'react';
import PricingCard from './components/PricingCard';
import CheckoutButton from './components/CheckoutButton';

/**
 * Pricing Page Component
 * 
 * Displays pricing tiers with Stripe checkout integration.
 * Supports both one-time payments and subscriptions.
 */

interface PricingTier {
  id: string;
  name: string;
  price: string;
  priceId: string; // Stripe Price ID
  period: 'month' | 'year' | 'one-time';
  features: string[];
  popular?: boolean;
  description?: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceId: '', // Free tier doesn't need a price ID
    period: 'month',
    features: [
      '10 requests per month',
      'Basic features',
      'Community support',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || 'price_pro_monthly',
    period: 'month',
    popular: true,
    description: 'Perfect for individuals',
    features: [
      '500 requests per month',
      'All basic features',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Cancel anytime',
    ],
  },
  {
    id: 'teams',
    name: 'Teams',
    price: '$99',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_TEAMS || 'price_teams_monthly',
    period: 'month',
    description: 'Best for teams',
    features: [
      '2000 requests per month',
      'Everything in Pro',
      'Team collaboration',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (tierId: string, priceId: string, mode: 'subscription' | 'payment' = 'subscription') => {
    if (!priceId) {
      alert('This tier is not available for checkout.');
      return;
    }

    setLoading(tierId);

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In a real app, you'd include the auth token here
          // 'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId,
          mode,
          tierId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(`Error: ${error.message || 'Failed to start checkout'}`);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Select the perfect plan for your needs. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {pricingTiers.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              onCheckout={handleCheckout}
              loading={loading === tier.id}
            />
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center text-gray-400">
          <p className="mb-2">
            All plans include a 14-day money-back guarantee
          </p>
          <p>
            Need help choosing?{' '}
            <a href="mailto:support@example.com" className="text-blue-400 hover:text-blue-300">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

