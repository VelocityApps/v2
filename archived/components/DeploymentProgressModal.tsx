'use client';

import React from 'react';

interface DeploymentProgressModalProps {
  isOpen: boolean;
  step: string;
  progress: number;
}

export default function DeploymentProgressModal({ isOpen, step, progress }: DeploymentProgressModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#0066cc]/20 flex items-center justify-center mx-auto mb-4">
            <div className="w-12 h-12 border-4 border-[#0066cc] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Deploying Your App</h2>
          <p className="text-gray-400 text-sm">{step}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#0a0a0a] rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0066cc] to-[#3498db] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-center text-xs text-gray-500">
          {progress}% complete
        </div>
      </div>
    </div>
  );
}

