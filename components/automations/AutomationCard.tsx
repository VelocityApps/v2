'use client';

import { useState } from 'react';
import InstallModal from './InstallModal';

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

interface AutomationCardProps {
  automation: Automation;
  variant?: 'marketplace' | 'installed';
  onConfigure?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRemove?: () => void;
  status?: 'active' | 'paused' | 'error';
}

export default function AutomationCard({
  automation,
  variant = 'marketplace',
  onConfigure,
  onPause,
  onResume,
  onRemove,
  status,
}: AutomationCardProps) {
  const [showInstallModal, setShowInstallModal] = useState(false);

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
              status === 'paused' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-red-500/20 text-red-300'
            }`}>
              {status === 'active' ? 'Active' : status === 'paused' ? 'Paused' : 'Error'}
            </div>
          )}
        </div>

        <p className="text-gray-300 mb-4 line-clamp-2">{automation.description}</p>

        {variant === 'marketplace' && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <span>💰</span>
              <span className="font-semibold text-white">£{automation.price_monthly}/month</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>👥</span>
              <span>{automation.user_count} stores using this</span>
            </div>
          </div>
        )}

        {variant === 'marketplace' ? (
          <button
            onClick={() => setShowInstallModal(true)}
            className="w-full px-4 py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg font-medium transition-colors"
          >
            Add to Store
          </button>
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
    </>
  );
}

