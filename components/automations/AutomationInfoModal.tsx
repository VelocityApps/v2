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
  screenshots: { alt: string; placeholder: string }[];
  useCases: string[];
  roi?: string; // ROI or benefit statement
  setupTime?: string; // How long setup takes
}> = {
  'pinterest-stock-sync': {
    achievements: [
      'Automatically pins out-of-stock products to Pinterest within 5 minutes',
      'Captures waitlist emails from Pinterest traffic (10-30% signup rate)',
      'Maintains SEO presence for out-of-stock products (keeps rankings)',
      'Drives traffic back to your store when products restock',
      'Updates or removes pins automatically when products come back in stock',
      'Saves 2-3 hours/week of manual pinning work'
    ],
    screenshots: [
      { alt: 'Pinterest board showing out-of-stock products with waitlist links', placeholder: '/screenshots/pinterest-board.png' },
      { alt: 'VelocityApps dashboard showing pin creation activity and success metrics', placeholder: '/screenshots/pinterest-dashboard.png' }
    ],
    useCases: [
      'E-commerce stores with seasonal inventory',
      'Stores launching limited edition products',
      'Businesses wanting to maintain SEO presence for out-of-stock items',
      'Stores using Pinterest as a marketing channel'
    ],
    roi: 'Captures 20-50 waitlist signups/month on average, converting 30% when products restock',
    setupTime: '3 minutes - just connect Pinterest and choose your board'
  },
  'review-request-automator': {
    achievements: [
      'Automatically sends personalized review request emails 3-7 days after purchase',
      'Increases review collection rate from 2% (industry avg) to 8%+ (4x improvement)',
      'AI-optimized subject lines improve open rates by 20-30%',
      'AI-optimized send times improve open rates by 15-25%',
      'Tracks conversion rate (emails sent → reviews submitted) in real-time',
      'Integrates with Judge.me, Yotpo, Stamped.io, and Okendo',
      'Saves 5-10 hours/week of manual email sending'
    ],
    screenshots: [
      { alt: 'Sample review request email with personalized subject line and product details', placeholder: '/screenshots/review-email.png' },
      { alt: 'Analytics dashboard showing review submission rates, conversion metrics, and email performance', placeholder: '/screenshots/review-metrics.png' }
    ],
    useCases: [
      'Stores with low review rates (below 3%)',
      'Businesses wanting to improve product social proof',
      'Stores using reviews for SEO and marketing',
      'Merchants spending hours manually requesting reviews'
    ],
    roi: 'Average store gets 40-80 new reviews/month, improving product credibility and SEO rankings',
    setupTime: '5 minutes - connect review platform, customize email template, activate'
  },
  'low-stock-alerts': {
    achievements: [
      'Automatically monitors inventory levels in real-time (checks every 5 minutes)',
      'Sends instant alerts (email, Slack, SMS) when products fall below threshold',
      'Calculates sales velocity and predicts days until stockout',
      'Prevents lost sales from stockouts (average store saves £200-500/month)',
      'Supports daily digest mode (all low stock products in one email)',
      'Works with multiple locations and product variants',
      'Saves 3-5 hours/week of manual inventory checking'
    ],
    screenshots: [
      { alt: 'Low stock alert email showing product details, current stock, and days until stockout prediction', placeholder: '/screenshots/low-stock-email.png' },
      { alt: 'Inventory dashboard with real-time stock levels, alert history, and sales velocity metrics', placeholder: '/screenshots/inventory-dashboard.png' }
    ],
    useCases: [
      'Stores with frequently out-of-stock products',
      'Businesses with high inventory turnover',
      'Merchants managing inventory across multiple locations',
      'Stores wanting to prevent lost sales from stockouts'
    ],
    roi: 'Prevents 5-10 stockouts/month on average, saving £200-500 in potential lost sales',
    setupTime: '2 minutes - set your inventory threshold, choose alert channels, activate'
  },
  'abandoned-cart-recovery': {
    achievements: [
      'Automatically sends 3-email recovery sequence (1 hour, 24 hours, 72 hours)',
      'Recovers 10-15% of abandoned carts (industry avg: 5-10%) - 2x better',
      'Increases revenue by £500-2,000/month for average store',
      'Includes discount codes (10% off email 2, 15% off email 3) in recovery emails',
      'AI-optimized subject lines and send times for maximum conversion',
      'Tracks conversion rate (emails sent → carts recovered) with detailed analytics',
      'Saves 5-8 hours/week of manual follow-up work'
    ],
    screenshots: [
      { alt: 'Abandoned cart recovery email with cart items, discount code, and urgency messaging', placeholder: '/screenshots/cart-recovery-email.png' },
      { alt: 'Revenue dashboard showing recovered cart value, conversion rates, and email performance metrics', placeholder: '/screenshots/cart-recovery-metrics.png' }
    ],
    useCases: [
      'Stores with high cart abandonment rates (60%+ is normal)',
      'Businesses wanting to recover lost sales automatically',
      'E-commerce stores with average order value >£50',
      'Merchants manually following up on abandoned carts'
    ],
    roi: 'Average store recovers £500-2,000/month from abandoned carts, paying for itself 17-70x over',
    setupTime: '5 minutes - customize email templates, set discount amounts, activate'
  },
  'best-sellers-collection': {
    achievements: [
      'Automatically creates and updates "Best Sellers" collection daily (or weekly/monthly)',
      'Updates based on sales data (units sold, revenue, or orders - you choose)',
      'Improves discoverability of popular products (drives 20-30% more views)',
      'Increases sales of top products (products in collections sell 2-3x more)',
      'Supports custom ranking criteria (units, revenue, orders) and filters',
      'Handles multiple locations and product variants automatically',
      'Saves 1-2 hours/week of manual collection updates'
    ],
    screenshots: [
      { alt: 'Best Sellers collection displayed on storefront with top products automatically updated', placeholder: '/screenshots/best-sellers-collection.png' },
      { alt: 'Collection management dashboard showing update history, products added/removed, and ranking metrics', placeholder: '/screenshots/collection-dashboard.png' }
    ],
    useCases: [
      'Stores wanting to showcase popular products',
      'Businesses with changing product popularity',
      'Merchants manually updating best seller collections',
      'Stores using collections for marketing and SEO'
    ],
    roi: 'Products in collections see 2-3x more sales, increasing revenue by 15-25% on featured items',
    setupTime: '2 minutes - choose collection name, set update frequency, activate'
  }
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
      'Helps grow your Shopify store automatically'
    ],
    screenshots: [],
    useCases: [
      'Shopify store owners wanting to automate workflows',
      'Businesses looking to reduce manual work',
      'Merchants wanting to improve store performance'
    ],
    roi: 'Pays for itself by saving time and increasing revenue',
    setupTime: '5 minutes'
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

          {/* Screenshots / Visual Examples */}
          {info.screenshots.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-[#202223] mb-4 flex items-center gap-2">
                <span className="text-blue-400">📸</span>
                Visual Examples
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {info.screenshots.map((screenshot, index) => (
                  <div
                    key={index}
                    className="bg-[#f6f6f7] border border-[#e1e3e5] rounded-lg overflow-hidden hover:border-[#2563eb]/40 transition-colors"
                  >
                    <div className="aspect-video bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
                      {/* Try to load actual image, fallback to placeholder */}
                      <img
                        src={screenshot.placeholder}
                        alt={screenshot.alt}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // If image fails to load, show placeholder
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.placeholder')) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'placeholder text-center p-8 w-full h-full flex flex-col items-center justify-center';
                            placeholder.innerHTML = `
                              <div class="text-4xl mb-2">📸</div>
                              <p class="text-[#8c9196] text-sm">${screenshot.alt}</p>
                              <p class="text-[#8c9196] text-xs mt-2">Screenshot coming soon</p>
                            `;
                            parent.appendChild(placeholder);
                          }
                        }}
                      />
                    </div>
                    <div className="p-3 bg-[#f6f6f7]">
                      <p className="text-sm text-[#6d7175] text-center">{screenshot.alt}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#8c9196] mt-2 text-center">
                Actual screenshots will be available once automations are live
              </p>
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

          {/* ROI & Setup Info */}
          {(info.roi || info.setupTime) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {info.roi && (
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400 text-xl">💰</span>
                    <h4 className="text-sm font-semibold text-green-300">ROI</h4>
                  </div>
                  <p className="text-[#6d7175] text-sm">{info.roi}</p>
                </div>
              )}
              {info.setupTime && (
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400 text-xl">⚡</span>
                    <h4 className="text-sm font-semibold text-blue-300">Setup Time</h4>
                  </div>
                  <p className="text-[#6d7175] text-sm">{info.setupTime}</p>
                </div>
              )}
            </div>
          )}

          {/* Pricing */}
          <div className="bg-[#f6f6f7] border border-[#e1e3e5] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6d7175] text-sm">Starting at</p>
                <p className="text-2xl font-bold text-[#202223]">£{automation.price_monthly}/month</p>
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

