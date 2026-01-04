'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionStatus: 'free' | 'pro' | 'teams' | 'cancelled';
  onUpgrade?: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  subscriptionStatus,
  onUpgrade,
}: ProfileModalProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Profile & Billing</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-[#333] p-4 space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[#0066cc]/20 text-[#0066cc] border border-[#0066cc]/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'billing'
                  ? 'bg-[#0066cc]/20 text-[#0066cc] border border-[#0066cc]/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              Billing
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                      <div className="text-white font-medium mb-2">Email</div>
                      <div className="text-gray-400 text-sm">{user?.email || 'Not signed in'}</div>
                    </div>

                    <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                      <div className="text-white font-medium mb-2">User ID</div>
                      <div className="text-gray-400 text-sm font-mono text-xs break-all">{user?.id || 'N/A'}</div>
                    </div>

                    <button
                      onClick={signOut}
                      className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors border border-red-600/30"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Billing & Subscription</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                      <div className="text-white font-medium mb-2">Current Plan</div>
                      <div className="text-gray-400 text-sm capitalize mb-4">{subscriptionStatus}</div>
                      {subscriptionStatus === 'free' && onUpgrade && (
                        <button
                          onClick={() => {
                            onClose();
                            onUpgrade();
                          }}
                          className="w-full px-4 py-2 bg-gradient-to-r from-[#0066cc] to-[#3498db] hover:from-[#2980b9] hover:to-[#5dade2] text-white rounded-lg transition-all font-medium"
                        >
                          Upgrade to Pro
                        </button>
                      )}
                    </div>

                    {subscriptionStatus !== 'free' && (
                      <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                        <div className="text-white font-medium mb-2">Manage Subscription</div>
                        <div className="text-sm text-gray-400 mb-4">
                          Update your payment method or cancel your subscription
                        </div>
                        <button className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm rounded-lg transition-colors">
                          Manage Billing
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

