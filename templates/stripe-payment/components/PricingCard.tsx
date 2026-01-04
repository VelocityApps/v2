'use client';

import CheckoutButton from './CheckoutButton';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  priceId: string;
  period: 'month' | 'year' | 'one-time';
  features: string[];
  popular?: boolean;
  description?: string;
}

interface PricingCardProps {
  tier: PricingTier;
  onCheckout: (tierId: string, priceId: string, mode?: 'subscription' | 'payment') => void;
  loading?: boolean;
}

/**
 * Pricing Card Component
 * 
 * Displays a single pricing tier with features and checkout button.
 */
export default function PricingCard({ tier, onCheckout, loading }: PricingCardProps) {
  const isFree = tier.id === 'free';
  const mode = tier.period === 'one-time' ? 'payment' : 'subscription';

  return (
    <div
      className={`relative bg-gray-800 rounded-lg border-2 p-8 ${
        tier.popular
          ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-105'
          : 'border-gray-700'
      }`}
    >
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
        {tier.description && (
          <p className="text-gray-400 text-sm mb-4">{tier.description}</p>
        )}
        <div className="flex items-baseline justify-center">
          <span className="text-5xl font-bold text-white">{tier.price}</span>
          {tier.period !== 'one-time' && (
            <span className="text-gray-400 ml-2">/{tier.period}</span>
          )}
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg
              className="w-5 h-5 text-green-400 mr-3 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      {isFree ? (
        <button
          disabled
          className="w-full py-3 px-6 bg-gray-700 text-gray-400 rounded-lg font-semibold cursor-not-allowed"
        >
          Current Plan
        </button>
      ) : (
        <CheckoutButton
          tierId={tier.id}
          priceId={tier.priceId}
          mode={mode}
          onCheckout={onCheckout}
          loading={loading}
        />
      )}
    </div>
  );
}

