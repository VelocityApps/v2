'use client';

import { Automation } from './AutomationCard';

interface AutomationInfoModalProps {
  automation: Automation;
  isOpen: boolean;
  onClose: () => void;
  onInstall?: () => void;
}

// Automation-specific information about what they achieve
const automationInfo: Record<string, {
  achievements: string[];
  stats: { label: string; value: string; icon: string }[];
  useCases: string[];
  setupTime?: string;
}> = {
  'pinterest-stock-sync': {
    achievements: [
      'Automatically pins out-of-stock products to Pinterest within 5 minutes',
      'Captures waitlist emails from Pinterest traffic (10-30% signup rate)',
      'Maintains SEO presence for out-of-stock products (keeps rankings)',
      'Drives traffic back to your store when products restock',
      'Updates or removes pins automatically when products come back in stock',
    ],
    stats: [
      { label: 'Time saved per week', value: '2–3 hrs', icon: '⏱️' },
      { label: 'Waitlist signups per month', value: '20–50', icon: '📋' },
      { label: 'Conversion when restocked', value: '~30%', icon: '💰' },
    ],
    useCases: [
      'E-commerce stores with seasonal inventory',
      'Stores launching limited edition products',
      'Businesses wanting to maintain SEO presence for out-of-stock items',
      'Stores using Pinterest as a marketing channel',
    ],
    setupTime: '3 minutes — connect Pinterest and choose your board',
  },
  'review-request-automator': {
    achievements: [
      'Automatically sends personalized review request emails 3–7 days after delivery',
      'AI-optimized subject lines improve open rates by 20–30%',
      'Tracks conversion rate (emails sent → reviews submitted) in real-time',
      'Integrates with Judge.me, Yotpo, Stamped.io, and Okendo',
    ],
    stats: [
      { label: 'More reviews vs. manual', value: '4×', icon: '⭐' },
      { label: 'Time saved per week', value: '5–10 hrs', icon: '⏱️' },
      { label: 'Higher open rates (AI)', value: '+25%', icon: '📈' },
    ],
    useCases: [
      'Stores with low review rates (below 3%)',
      'Businesses wanting to improve product social proof',
      'Stores using reviews for SEO and marketing',
      'Merchants spending hours manually requesting reviews',
    ],
    setupTime: '5 minutes — connect your review platform and activate',
  },
  'low-stock-alerts': {
    achievements: [
      'Monitors inventory levels in real-time (checks every 5 minutes)',
      'Sends instant alerts via email, Slack, or both when stock falls below threshold',
      'Calculates sales velocity and predicts days until stockout',
      'Supports daily digest mode — all low-stock products in one email',
      'Works with multiple locations and product variants',
    ],
    stats: [
      { label: 'Prevented stockouts/month', value: '5–10', icon: '📦' },
      { label: 'Lost sales avoided/month', value: '£200–500', icon: '💰' },
      { label: 'Time saved per week', value: '3–5 hrs', icon: '⏱️' },
    ],
    useCases: [
      'Stores with frequently out-of-stock products',
      'Businesses with high inventory turnover',
      'Merchants managing inventory across multiple locations',
      'Stores wanting to prevent lost sales from stockouts',
    ],
    setupTime: '2 minutes — set your threshold, choose alert channels, activate',
  },
  'abandoned-cart-recovery': {
    achievements: [
      'Sends a 3-email recovery sequence automatically (1 hr, 24 hrs, 72 hrs)',
      'Recovers 10–15% of abandoned carts — 2× the industry average',
      'Includes discount codes (10% off email 2, 15% off email 3)',
      'AI-optimized subject lines and send times for maximum conversion',
      'Tracks revenue recovered with detailed per-email analytics',
    ],
    stats: [
      { label: 'Revenue recovered/month', value: '£500–2k', icon: '💰' },
      { label: 'Cart recovery rate', value: '10–15%', icon: '🛒' },
      { label: 'Time saved per week', value: '5–8 hrs', icon: '⏱️' },
    ],
    useCases: [
      'Stores with high cart abandonment rates (60%+ is normal)',
      'Businesses wanting to recover lost sales automatically',
      'E-commerce stores with average order value >£50',
      'Merchants manually following up on abandoned carts',
    ],
    setupTime: '5 minutes — customise email templates, set discount amounts, activate',
  },
  'best-sellers-collection': {
    achievements: [
      'Automatically creates and updates a "Best Sellers" collection daily or weekly',
      'Rankings based on real sales data — units sold, revenue, or orders',
      'Improves discoverability of popular products (drives 20–30% more views)',
      'Handles multiple locations and product variants automatically',
    ],
    stats: [
      { label: 'More sales on featured items', value: '2–3×', icon: '🏆' },
      { label: 'Revenue uplift on collection', value: '+15–25%', icon: '💰' },
      { label: 'Time saved per week', value: '1–2 hrs', icon: '⏱️' },
    ],
    useCases: [
      'Stores wanting to showcase popular products',
      'Businesses with changing product popularity',
      'Merchants manually updating best seller collections',
      'Stores using collections for marketing and SEO',
    ],
    setupTime: '2 minutes — choose collection name, set update frequency, activate',
  },
};

export default function AutomationInfoModal({
  automation,
  isOpen,
  onClose,
  onInstall,
}: AutomationInfoModalProps) {
  if (!isOpen) return null;

  const info = automationInfo[automation.slug] || {
    achievements: [
      'Saves time by automating repetitive tasks',
      'Increases efficiency and reduces manual work',
      'Provides real-time monitoring and alerts',
      'Helps grow your Shopify store automatically',
    ],
    stats: [
      { label: 'Time saved per week', value: '2–5 hrs', icon: '⏱️' },
      { label: 'Setup time', value: '5 min', icon: '⚡' },
    ],
    useCases: [
      'Shopify store owners wanting to automate workflows',
      'Businesses looking to reduce manual work',
      'Merchants wanting to improve store performance',
    ],
    setupTime: '5 minutes',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white border border-[#e1e3e5] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e1e3e5] p-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{automation.icon}</div>
            <div>
              <h2 className="text-2xl font-bold text-[#202223]">{automation.name}</h2>
              <p className="text-[#6d7175] capitalize">{automation.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#f6f6f7] rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6 text-[#6d7175]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* What This Achieves */}
          <div>
            <h3 className="text-xl font-semibold text-[#202223] mb-4 flex items-center gap-2">
              <span className="text-green-400">✨</span>
              What This Achieves
            </h3>
            <div className="bg-[#f6f6f7] border border-[#e1e3e5] rounded-lg p-6">
              <ul className="space-y-3">
                {info.achievements.map((achievement, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-green-400 mt-1 flex-shrink-0">✓</span>
                    <span className="text-[#6d7175] leading-relaxed">{achievement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Stats */}
          {info.stats.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-[#202223] mb-4 flex items-center gap-2">
                <span className="text-blue-400">📊</span>
                By the numbers
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {info.stats.map((stat, index) => (
                  <div key={index} className="bg-[#f6f6f7] border border-[#e1e3e5] rounded-xl p-4 text-center">
                    <div className="text-2xl mb-1">{stat.icon}</div>
                    <div className="text-xl font-bold text-[#202223] leading-tight">{stat.value}</div>
                    <div className="text-xs text-[#6d7175] mt-1 leading-snug">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best For */}
          <div>
            <h3 className="text-xl font-semibold text-[#202223] mb-4 flex items-center gap-2">
              <span className="text-purple-400">🎯</span>
              Best For
            </h3>
            <div className="bg-[#f6f6f7] border border-[#e1e3e5] rounded-lg p-6">
              <ul className="space-y-2">
                {info.useCases.map((useCase, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                    <span className="text-[#6d7175]">{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Features */}
          {automation.features && automation.features.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-[#202223] mb-4 flex items-center gap-2">
                <span className="text-yellow-400">⚡</span>
                Key Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {automation.features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-[#6d7175] bg-[#f6f6f7] border border-[#e1e3e5] rounded-lg p-3"
                  >
                    <span className="text-[#0066cc] flex-shrink-0">→</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Setup time */}
          {info.setupTime && (
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4 flex items-center gap-3">
              <span className="text-blue-400 text-xl flex-shrink-0">⚡</span>
              <div>
                <h4 className="text-sm font-semibold text-[#202223]">Setup time</h4>
                <p className="text-[#6d7175] text-sm">{info.setupTime}</p>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="bg-[#f6f6f7] border border-[#e1e3e5] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6d7175] text-sm">Starting at</p>
                <p className="text-2xl font-bold text-[#202223]">${automation.price_monthly}/month</p>
              </div>
              <div className="text-right">
                <p className="text-[#6d7175] text-sm">{automation.user_count} stores using this</p>
                {automation.user_count > 0 && (
                  <p className="text-green-400 text-sm">✓ Proven by merchants</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#e1e3e5] p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white hover:bg-[#f6f6f7] border border-[#e1e3e5] text-[#202223] rounded-lg font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onInstall?.();
            }}
            className="flex-1 px-4 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-medium transition-colors"
          >
            Add to Store
          </button>
        </div>
      </div>
    </div>
  );
}

