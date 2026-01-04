'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionStatus: 'free' | 'pro' | 'teams' | 'cancelled';
  onUpgrade?: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  subscriptionStatus,
  onUpgrade,
}: SettingsModalProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'billing' | 'preferences'>('general');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>('dark');

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
        // Close when clicking backdrop
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
          <h2 className="text-xl font-bold text-white">Settings</h2>
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
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'general'
                  ? 'bg-[#0066cc]/20 text-[#0066cc] border border-[#0066cc]/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'preferences'
                  ? 'bg-[#0066cc]/20 text-[#0066cc] border border-[#0066cc]/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'account'
                  ? 'bg-[#0066cc]/20 text-[#0066cc] border border-[#0066cc]/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              Account
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
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                      <div>
                        <div className="text-white font-medium">Email Notifications</div>
                        <div className="text-sm text-gray-400">Receive email updates about your projects</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationsEnabled}
                          onChange={(e) => setNotificationsEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0066cc] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0066cc]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                      <div>
                        <div className="text-white font-medium">Auto-save Projects</div>
                        <div className="text-sm text-gray-400">Automatically save your work as you code</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoSave}
                          onChange={(e) => setAutoSave(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0066cc] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0066cc]"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                      <div className="text-white font-medium mb-3">Theme</div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setTheme('dark')}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#0066cc] text-white'
                              : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                          }`}
                        >
                          Dark
                        </button>
                        <button
                          onClick={() => setTheme('light')}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            theme === 'light'
                              ? 'bg-[#0066cc] text-white'
                              : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                          }`}
                        >
                          Light
                        </button>
                        <button
                          onClick={() => setTheme('auto')}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            theme === 'auto'
                              ? 'bg-[#0066cc] text-white'
                              : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                          }`}
                        >
                          Auto
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                      <div className="text-white font-medium mb-2">Email</div>
                      <div className="text-gray-400 text-sm">{user?.email || 'Not signed in'}</div>
                    </div>

                    <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                      <div className="text-white font-medium mb-2">Subscription</div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-400 text-sm capitalize">{subscriptionStatus}</div>
                        {subscriptionStatus === 'free' && onUpgrade && (
                          <button
                            onClick={onUpgrade}
                            className="px-4 py-2 bg-[#0066cc] hover:bg-[#2980b9] text-white text-sm rounded-lg transition-colors"
                          >
                            Upgrade
                          </button>
                        )}
                      </div>
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
                          onClick={onUpgrade}
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

