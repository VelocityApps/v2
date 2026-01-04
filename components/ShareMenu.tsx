'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ShareCardGenerator from './ShareCardGenerator';

interface ShareMenuProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  projectName?: string;
  projectId?: string;
  generationTime?: number;
  generationMode?: string;
  modelUsed?: string;
  subscriptionStatus: 'free' | 'pro' | 'teams' | 'cancelled';
  onUpgrade?: () => void;
}

export default function ShareMenu({
  isOpen,
  onClose,
  code,
  projectName,
  projectId,
  generationTime,
  generationMode,
  modelUsed,
  subscriptionStatus,
  onUpgrade,
}: ShareMenuProps) {
  const { session } = useAuth();
  const [showCardGenerator, setShowCardGenerator] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Focus trap
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const focusableElements = menuRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => window.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleShareInstagram = async () => {
    if (subscriptionStatus === 'free') {
      onUpgrade?.();
      return;
    }
    setShowCardGenerator(true);
  };

  const handleShareX = async () => {
    const text = `Just built ${projectName || 'an app'} with @VelocityApps in ${generationTime || 15} seconds 🔥\n\nTry it free: https://velocityapps.dev`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    trackShare('x', 'tweet');
  };

  const handleShareLinkedIn = async () => {
    if (subscriptionStatus === 'free') {
      onUpgrade?.();
      return;
    }
    const text = `Just built ${projectName || 'an app'} with VelocityApps in ${generationTime || 15} seconds! Check it out:`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl || 'https://velocityapps.dev')}`, '_blank');
    trackShare('linkedin', 'post');
  };

  const handleCopyLink = async () => {
    if (!shareUrl) {
      // Generate preview link
      try {
        const response = await fetch('/api/share/generate-link', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ code, projectId, projectName }),
        });
        const data = await response.json();
        if (data.url) {
          setShareUrl(data.url);
          await navigator.clipboard.writeText(data.url);
          setCopied('link');
          setTimeout(() => setCopied(null), 2000);
          trackShare('link', 'copy');
        } else {
          alert('Failed to generate link. Please try again.');
        }
      } catch (error) {
        console.error('Error generating link:', error);
        alert('Failed to generate link. Please try again.');
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied('link');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied('code');
      setTimeout(() => setCopied(null), 2000);
      trackShare('code', 'copy');
    } catch (error) {
      console.error('Error copying code:', error);
    }
  };

  const handleDownloadZip = async () => {
    // This would create a ZIP file
    // For now, we'll trigger a download
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'project'}-velocityapps.zip`;
    a.click();
    URL.revokeObjectURL(url);
    trackShare('zip', 'download');
  };

  const trackShare = (platform: string, type: string) => {
    fetch('/api/share/track', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        platform,
        type,
        projectId,
        generationMode,
      }),
    }).catch(console.error);
  };

  const isPremium = subscriptionStatus === 'pro' || subscriptionStatus === 'teams';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 md:z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Share Menu */}
      <div
        ref={menuRef}
        className="fixed left-16 md:left-16 bottom-0 md:top-0 md:bottom-auto h-[80vh] md:h-full w-full md:w-80 bg-gray-900/95 backdrop-blur-md border-r border-t md:border-t-0 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50 flex flex-col md:animate-in md:slide-in-from-left duration-200 rounded-t-2xl md:rounded-none"
        role="dialog"
        aria-label="Share menu"
        aria-modal="true"
      >
        {/* Mobile Handle */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
        </div>
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white font-semibold">Share Your Creation</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close share menu"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto p-2 md:p-2 space-y-1">
          {/* Instagram Story */}
          <ShareOption
            icon={
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
            }
            title="Instagram Story"
            subtitle="Share as 9:16 story"
            onClick={handleShareInstagram}
            disabled={!isPremium}
            premium={!isPremium}
          />

          {/* X / Twitter */}
          <ShareOption
            icon={
              <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
              </svg>
            }
            title="Post to X / Twitter"
            subtitle="Share with preview card"
            onClick={handleShareX}
          />

          {/* LinkedIn */}
          <ShareOption
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            }
            title="Share on LinkedIn"
            subtitle="Professional preview"
            onClick={handleShareLinkedIn}
            disabled={!isPremium}
            premium={!isPremium}
          />

          {/* Copy Share Link */}
          <ShareOption
            icon={
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
            title="Copy Share Link"
            subtitle="7-day preview link"
            onClick={handleCopyLink}
            copied={copied === 'link'}
          />

          {/* Copy Code */}
          <ShareOption
            icon={
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }
            title="Copy Code to Clipboard"
            subtitle="All files included"
            onClick={handleCopyCode}
            copied={copied === 'code'}
          />

          {/* Download ZIP */}
          <ShareOption
            icon={
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="Download as ZIP"
            subtitle="Export complete project"
            onClick={handleDownloadZip}
          />

          {/* Generate Share Card */}
          <ShareOption
            icon={
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            title="Generate Share Card"
            subtitle="Custom branded image"
            onClick={() => setShowCardGenerator(true)}
          />
        </div>

        {/* Mobile: Show message if no code */}
        {!code || code === '// Your code will appear here\n' ? (
          <div className="px-4 py-3 bg-yellow-500/10 border-t border-yellow-500/20">
            <p className="text-yellow-400 text-sm text-center">Generate code first to share</p>
          </div>
        ) : null}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 text-xs text-gray-400 text-center">
          Made with VelocityApps
        </div>
      </div>

      {/* Share Card Generator Modal */}
      {showCardGenerator && (
        <ShareCardGenerator
          isOpen={showCardGenerator}
          onClose={() => setShowCardGenerator(false)}
          code={code}
          projectName={projectName}
          generationTime={generationTime}
          generationMode={generationMode}
          modelUsed={modelUsed}
          subscriptionStatus={subscriptionStatus}
        />
      )}
    </>
  );
}

interface ShareOptionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  premium?: boolean;
  copied?: boolean;
}

function ShareOption({ icon, title, subtitle, onClick, disabled, premium, copied }: ShareOptionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'}
        ${copied ? 'bg-green-500/10 border border-green-500/30' : ''}
        focus:outline-none focus:ring-2 focus:ring-[#0066cc]/50
      `}
      aria-label={title}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 text-left">
        <div className="text-white text-sm font-medium">{title}</div>
        <div className="text-gray-400 text-xs">{subtitle}</div>
      </div>
      {premium && (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )}
      {copied && (
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

