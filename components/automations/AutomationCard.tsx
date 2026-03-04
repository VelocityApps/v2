'use client';

import { useState } from 'react';
import InstallModal from './InstallModal';
import AutomationInfoModal from './AutomationInfoModal';

export interface Automation {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price_monthly: number;
  icon: string;
  features: string[];
  user_count: number;
  config_schema?: Record<string, any>;
}

interface AutomationMetrics {
  successRate?: number;
  totalRuns?: number;
  conversionRate?: number;
}

interface AutomationCardProps {
  automation: Automation;
  variant?: 'marketplace' | 'installed';
  onConfigure?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRemove?: () => void;
  onManageBilling?: () => void;
  status?: 'active' | 'paused' | 'error' | 'trial' | 'cancelled';
  stripeSubscriptionId?: string | null;
  trialEndsAt?: string | null;
  /** When true (marketplace), show "£X/month, no trial available" instead of trial badge */
  trialAlreadyUsed?: boolean;
  metrics?: AutomationMetrics;
  /** When true, show a Coming Soon banner and disable install */
  comingSoon?: boolean;
}

function daysLeft(endsAt: string | null | undefined): number | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const days = Math.ceil((end - now) / (24 * 60 * 60 * 1000));
  return days > 0 ? days : 0;
}

export default function AutomationCard({
  automation,
  variant = 'marketplace',
  onConfigure,
  onPause,
  onResume,
  onRemove,
  onManageBilling,
  status,
  stripeSubscriptionId,
  trialEndsAt,
  trialAlreadyUsed,
  metrics,
  comingSoon = false,
}: AutomationCardProps) {
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <>
      <div className={`relative bg-white border border-[#e1e3e5] rounded-xl p-6 transition-all ${comingSoon ? 'opacity-70' : 'hover:border-[#2563eb]/40 hover:shadow-sm'}`}>
        {comingSoon && (
          <div className="absolute top-4 right-4 px-2.5 py-1 bg-[#f6f6f7] border border-[#e1e3e5] rounded-full text-xs font-semibold text-[#6d7175] tracking-wide z-10">
            Coming Soon
          </div>
        )}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{automation.icon}</div>
            <div>
              <h3 className="text-base font-semibold text-[#202223]">{automation.name}</h3>
              <p className="text-xs text-[#6d7175] capitalize">{automation.category}</p>
            </div>
          </div>
          {variant === 'installed' && status && (
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              status === 'active' ? 'bg-[#e3f9e3] text-[#008060]' :
              status === 'trial' ? 'bg-[#e8f0fe] text-[#2563eb]' :
              status === 'paused' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            }`}>
              {status === 'active' ? 'Active' : status === 'trial' ? 'Trial' : status === 'paused' ? 'Paused' : status === 'cancelled' ? 'Cancelled' : 'Error'}
            </div>
          )}
        </div>

        <p className="text-[#6d7175] text-sm mb-4 line-clamp-2">{automation.description}</p>

        {variant === 'marketplace' && (
          <div className="mb-4 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {trialAlreadyUsed ? (
                <span className="text-sm text-[#6d7175]">£{automation.price_monthly}/month — no trial available</span>
              ) : (
                <>
                  <span className="px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#2563eb] text-xs font-medium">7-day free trial</span>
                  <span className="text-sm text-[#6d7175]">then £{automation.price_monthly}/mo</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#6d7175]">
              <span>👥</span>
              <span>{automation.user_count} stores using this</span>
            </div>
            {metrics && metrics.successRate !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-[#6d7175]">
                <span className="text-[#008060]">✓</span>
                <span>{metrics.successRate.toFixed(1)}% success rate</span>
              </div>
            )}
            {metrics && metrics.conversionRate !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-[#6d7175]">
                <span>📈</span>
                <span>{metrics.conversionRate.toFixed(1)}% conversion rate</span>
              </div>
            )}
          </div>
        )}

        {variant === 'installed' && status === 'trial' && trialEndsAt && (
          <div className="mb-4 flex items-center gap-2 text-sm text-[#2563eb]">
            <span>⏱</span>
            <span>
              {(() => {
                const d = daysLeft(trialEndsAt);
                return d !== null ? `${d} day${d !== 1 ? 's' : ''} left in trial` : 'Trial ended';
              })()}
            </span>
          </div>
        )}

        {variant === 'marketplace' ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowInfoModal(true)}
              className="flex-1 px-4 py-2 bg-white hover:bg-[#f6f6f7] border border-[#e1e3e5] text-[#202223] rounded-lg font-medium transition-colors text-sm"
            >
              More Info
            </button>
            {comingSoon ? (
              <button
                disabled
                className="flex-1 px-4 py-2 bg-[#f6f6f7] text-[#8c9196] rounded-lg font-medium cursor-not-allowed text-sm border border-[#e1e3e5]"
              >
                Coming Soon
              </button>
            ) : (
              <button
                onClick={() => setShowInstallModal(true)}
                className="flex-1 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-medium transition-colors text-sm shadow-sm"
              >
                Add to Store
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={onConfigure}
                className="flex-1 px-3 py-2 bg-white hover:bg-[#f6f6f7] border border-[#e1e3e5] text-[#202223] rounded-lg font-medium transition-colors text-sm"
              >
                Configure
              </button>
              {status === 'active' || status === 'trial' ? (
                <button
                  onClick={onPause}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-medium transition-colors text-sm"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={onResume}
                  className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg font-medium transition-colors text-sm"
                >
                  Resume
                </button>
              )}
              <button
                onClick={onRemove}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-medium transition-colors text-sm"
              >
                Remove
              </button>
            </div>
            {stripeSubscriptionId && (
              <button
                onClick={onManageBilling}
                className="w-full px-4 py-2 bg-white hover:bg-[#f6f6f7] text-[#6d7175] hover:text-[#202223] border border-[#e1e3e5] rounded-lg text-sm font-medium transition-colors"
              >
                Manage subscription / Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {showInstallModal && !comingSoon && (
        <InstallModal
          automation={automation}
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
        />
      )}

      {showInfoModal && (
        <AutomationInfoModal
          automation={automation}
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          onInstall={() => {
            setShowInfoModal(false);
            setShowInstallModal(true);
          }}
        />
      )}
    </>
  );
}

