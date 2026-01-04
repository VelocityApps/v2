'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UserTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'merchant' | 'developer') => void;
}

export default function UserTypeModal({ isOpen, onClose, onSelect }: UserTypeModalProps) {
  const { session } = useAuth();
  const [selected, setSelected] = useState<'merchant' | 'developer' | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSelect = async (type: 'merchant' | 'developer') => {
    setSelected(type);
    setSaving(true);

    try {
      // Save preference to database
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          shopify_view_mode: type,
        }),
      });

      if (response.ok) {
        const { preferences } = await response.json();
        console.log('[UserTypeModal] Preference saved:', preferences);
        onSelect(type);
        onClose();
      } else {
        const errorData = await response.json();
        console.error('Failed to save preference:', errorData);
        // Still proceed with selection
        onSelect(type);
        onClose();
      }
    } catch (error) {
      console.error('Error saving preference:', error);
      // Still proceed with selection
      onSelect(type);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🛍️</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to VelocityApps for Shopify!
          </h2>
          <p className="text-gray-400">
            How would you like to use VelocityApps?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Merchant Option */}
          <button
            onClick={() => handleSelect('merchant')}
            disabled={saving}
            className={`relative p-6 rounded-xl border-2 transition-all text-left ${
              selected === 'merchant'
                ? 'border-[#0066cc] bg-[#0066cc]/10'
                : 'border-[#333] bg-[#0a0a0a] hover:border-[#444]'
            } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {selected === 'merchant' && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 rounded-full bg-[#0066cc] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
            <div className="text-3xl mb-3">🛍️</div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">I'm a Store Owner</h3>
              <span className="px-2 py-0.5 bg-[#0066cc]/20 text-[#0066cc] text-xs font-medium rounded-full">
                Recommended
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              I just want working apps for my store.
              <br />
              Hide the technical stuff.
            </p>
          </button>

          {/* Developer Option */}
          <button
            onClick={() => handleSelect('developer')}
            disabled={saving}
            className={`relative p-6 rounded-xl border-2 transition-all text-left ${
              selected === 'developer'
                ? 'border-[#0066cc] bg-[#0066cc]/10'
                : 'border-[#333] bg-[#0a0a0a] hover:border-[#444]'
            } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {selected === 'developer' && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 rounded-full bg-[#0066cc] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
            <div className="text-3xl mb-3">👨‍💻</div>
            <h3 className="text-lg font-semibold text-white mb-2">I'm a Developer</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              I want to see code and customize everything.
              <br />
              Show me the technical details.
            </p>
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          You can change this anytime in Settings
        </div>

        {saving && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-[#0066cc] border-t-transparent rounded-full animate-spin"></div>
            Saving your preference...
          </div>
        )}
      </div>
    </div>
  );
}

