'use client';

import React, { useState } from 'react';
import { PreviewPanel, Header, Actions, Button as PreviewButton } from './preview/PreviewPanel';

interface ShopifyMerchantPreviewProps {
  deployment: {
    appName: string;
    installUrl: string;
    appUrl: string;
    previewUrl: string;
    features: string[];
    appType?: string;
  };
  onToggleView?: () => void;
}

export default function ShopifyMerchantPreview({ deployment, onToggleView }: ShopifyMerchantPreviewProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const generateDescription = (appType?: string): string => {
    switch (appType) {
      case 'reviews':
        return 'Collect and display customer reviews for your products';
      case 'inventory':
        return 'Track inventory levels and get low stock alerts';
      case 'orders':
        return 'Manage orders with advanced filtering and bulk actions';
      case 'email':
        return 'Automate emails for abandoned carts and order confirmations';
      case 'analytics':
        return 'View sales analytics and revenue trends';
      default:
        return 'A powerful app for your Shopify store';
    }
  };

  return (
    <PreviewPanel type="shopify-merchant">
      <div className="h-full overflow-y-auto">
        {/* Success Header */}
        <div className="text-center mb-8 pt-6">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Your Shopify App is Ready!</h2>
          <p className="text-gray-400">Deployed and ready to install</p>
        </div>

        {/* App Card */}
        <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#0066cc] to-[#3498db] flex items-center justify-center text-3xl flex-shrink-0">
              🛍️
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-2">{deployment.appName}</h3>
              <p className="text-gray-400 text-sm mb-4">{generateDescription(deployment.appType)}</p>
              
              {deployment.features.length > 0 && (
                <div className="space-y-2 mb-4">
                  {deployment.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-green-500">✓</span>
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>☁️</span>
                <span>Hosted by VelocityApps</span>
              </div>
            </div>
          </div>
        </div>

        {/* Install Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Install to Your Store</h3>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5">
                1
              </div>
              <p className="text-gray-300 text-sm pt-0.5">Click "Install App" below</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5">
                2
              </div>
              <p className="text-gray-300 text-sm pt-0.5">Connect your Shopify store (takes 30 seconds)</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5">
                3
              </div>
              <p className="text-gray-300 text-sm pt-0.5">Start using your new app!</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              onClick={() => window.open(deployment.installUrl, '_blank', 'noopener,noreferrer')}
              className="flex-1 px-4 py-4 bg-[#0066cc] hover:bg-[#0056b3] text-white rounded-lg font-medium transition-colors text-center text-lg"
            >
              🛍️ Install to My Store
            </button>
            <button
              onClick={() => window.open(deployment.previewUrl, '_blank', 'noopener,noreferrer')}
              className="flex-1 px-4 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-center"
            >
              👀 Preview App First
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 bg-[#0a0a0a] p-3 rounded-lg">
            <span>🔒</span>
            <span>Secure OAuth connection. We never access your store data.</span>
          </div>
        </div>

        {/* What's Included */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">What's Included</h3>
          <div className="space-y-2">
            {[
              'App hosting (no setup needed)',
              'Automatic updates',
              '24/7 uptime monitoring',
              'Included in your plan',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-green-500">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-white mb-1">What happens after I click Install?</p>
              <p className="text-xs text-gray-400">
                You'll be redirected to Shopify to authorize the app. Once authorized, the app appears in your Shopify admin.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">Do I need to do any technical setup?</p>
              <p className="text-xs text-gray-400">
                No! Everything is already configured and hosted. Just click Install and you're done.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">Can I customize the app later?</p>
              <p className="text-xs text-gray-400">
                Yes! You can request changes by chatting with our AI, and we'll update your app automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Advanced Options (Collapsible) */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-400 transition-colors py-2"
          >
            <span>Advanced Options</span>
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-2 bg-[#0a0a0a] rounded-lg p-4">
              {onToggleView && (
                <button
                  onClick={onToggleView}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
                >
                  <span className="text-xl">👨‍💻</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">View Source Code</p>
                    <p className="text-xs text-gray-400">See the code behind your app</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        {onToggleView && (
          <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-[#333]">
            <span className="text-sm text-gray-400">View Mode:</span>
            <div className="flex gap-2">
              <button
                onClick={onToggleView}
                className="px-4 py-2 bg-[#0066cc] text-white rounded-lg text-sm font-medium"
              >
                Switch to Developer View
              </button>
            </div>
          </div>
        )}
      </div>
    </PreviewPanel>
  );
}

