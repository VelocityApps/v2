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
  status?: 'active' | 'paused' | 'error' | 'trial';
  trialEndsAt?: string | null;
  /** When true (marketplace), show "£X/month, no trial available" instead of trial badge */
  trialAlreadyUsed?: boolean;
  metrics?: AutomationMetrics;
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
  status,
  trialEndsAt,
  trialAlreadyUsed,
  metrics,
}: AutomationCardProps) {
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <>
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 hover:border-[#444] transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{automation.icon}</div>
            <div>
              <h3 className="text-lg font-semibold text-white">{automation.name}</h3>
              <p className="text-sm text-gray-400">{automation.category}</p>
            </div>
          </div>
          {variant === 'installed' && status && (
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              status === 'active' ? 'bg-green-500/20 text-green-300' :
              status === 'trial' ? 'bg-blue-500/20 text-blue-300' :
              status === 'paused' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-red-500/20 text-red-300'
            }`}>
              {status === 'active' ? 'Active' : status === 'trial' ? 'Trial' : status === 'paused' ? 'Paused' : 'Error'}
            </div>
          )}
        </div>

        <p className="text-gray-300 mb-4 line-clamp-2">{automation.description}</p>

        {variant === 'marketplace' && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {trialAlreadyUsed ? (
                <span className="text-sm text-gray-400">£{automation.price_monthly}/month — no trial available</span>
              ) : (
                <>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-medium">7-Day Free Trial</span>
                  <span className="text-sm text-gray-400">then £{automation.price_monthly}/month</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>👥</span>
              <span>{automation.user_count} stores using this</span>
            </div>
            {metrics && metrics.successRate !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">
                  {metrics.successRate.toFixed(1)}% success rate
                </span>
              </div>
            )}
            {metrics && metrics.conversionRate !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-400">📈</span>
                <span className="text-gray-300">
                  {metrics.conversionRate.toFixed(1)}% conversion rate
                </span>
              </div>
            )}
          </div>
        )}

        {variant === 'installed' && status === 'trial' && trialEndsAt && (
          <div className="mb-4 flex items-center gap-2 text-sm text-blue-300">
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
              className="flex-1 px-4 py-2 bg-[#333] hover:bg-[#444] text-white rounded-lg font-medium transition-colors text-sm"
            >
              More Info
            </button>
            <button
              onClick={() => setShowInstallModal(true)}
              className="flex-1 px-4 py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg font-medium transition-colors"
            >
              Add to Store
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onConfigure}
              className="flex-1 px-4 py-2 bg-[#333] hover:bg-[#444] text-white rounded-lg font-medium transition-colors"
            >
              Configure
            </button>
            {status === 'active' ? (
              <button
                onClick={onPause}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg font-medium transition-colors"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={onResume}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg font-medium transition-colors"
              >
                Resume
              </button>
            )}
            <button
              onClick={onRemove}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium transition-colors"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {showInstallModal && (
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

