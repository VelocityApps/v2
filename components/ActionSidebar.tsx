'use client';

import { useState } from 'react';

interface ActionSidebarProps {
  // Project actions
  onNewProject: () => void;
  onSave: () => void;
  saving: boolean;
  hasCode: boolean;
  
  // Code actions
  onCopyCode: () => void;
  copied: boolean;
  onShare: () => void;
  shareLoading: boolean;
  
  // Export/Deploy actions
  onGitHubExport: () => void;
  onRailwayDeploy: () => void;
  onVercelDeploy: () => void;
  onPWAExport?: () => void;
  onComponentLibrary?: () => void;
  onVersionHistory?: () => void;
  onTemplateMarketplace?: () => void;
  
  // User actions
  onSignOut: () => void;
  onUpgrade: () => void;
  
  // User info
  userEmail?: string;
  userCredits: number;
  rateLimitRemaining: number;
  referralCount: number;
  subscriptionStatus: 'free' | 'pro' | 'teams' | 'cancelled';
  
  // Settings
  brandingEnabled: boolean;
  onBrandingToggle: (enabled: boolean) => void;
}

export default function ActionSidebar({
  onNewProject,
  onSave,
  saving,
  hasCode,
  onCopyCode,
  copied,
  onShare,
  shareLoading,
  onGitHubExport,
  onRailwayDeploy,
  onVercelDeploy,
  onPWAExport,
  onComponentLibrary,
  onVersionHistory,
  onTemplateMarketplace,
  onSignOut,
  onUpgrade,
  userEmail,
  userCredits,
  rateLimitRemaining,
  referralCount,
  subscriptionStatus,
  brandingEnabled,
  onBrandingToggle,
}: ActionSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showUserInfo, setShowUserInfo] = useState(false);

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] hover:from-[#222] hover:to-[#111] rounded-xl border border-[#2a2a2a] shadow-lg transition-all"
        aria-label="Toggle menu"
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed md:static left-0 top-0 h-full z-40
          bg-gradient-to-b from-[#141414] to-[#0a0a0a] border-r border-[#2a2a2a]
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col
          w-[72px]
        `}
      >
        {/* Logo Area */}
        <div className="p-3 border-b border-[#2a2a2a]">
          <div className="w-10 h-10 mx-auto flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="sidebarRingGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#00bcd4" stopOpacity={1} />
                  <stop offset="50%" stopColor="#00ff88" stopOpacity={1} />
                  <stop offset="100%" stopColor="#32cd32" stopOpacity={1} />
                </linearGradient>
              </defs>
              {/* Outer gradient ring */}
              <circle cx="80" cy="80" r="56" fill="url(#sidebarRingGradient)"/>
              {/* Inner dark teal circle */}
              <circle cx="80" cy="80" r="46" fill="#0a0a0a"/>
              {/* Upper V shape (orange, pointing down) */}
              <path d="M 56 48 L 80 28 L 104 48 Z" fill="#ff6600"/>
              {/* Lower V shape (teal, pointing up) */}
              <path d="M 56 112 L 80 132 L 104 112 Z" fill="#40e0d0"/>
            </svg>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 flex flex-col items-center py-4 gap-2 overflow-y-auto">
          {/* Project Actions */}
          <div className="flex flex-col gap-1.5 w-full px-2">
            <SidebarButton
              onClick={onNewProject}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
              tooltip="New Project"
            />

            <SidebarButton
              onClick={onSave}
              disabled={saving}
              variant="primary"
              icon={
                saving ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin block"></span>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )
              }
              tooltip="Save"
            />
          </div>

          {/* Divider */}
          <div className="w-10 h-px bg-gradient-to-r from-transparent via-[#333] to-transparent my-1"></div>

          {/* Code Actions */}
          <div className="flex flex-col gap-1.5 w-full px-2">
            <SidebarButton
              onClick={onCopyCode}
              variant={copied ? 'success' : 'primary'}
              icon={
                copied ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )
              }
              tooltip={copied ? 'Copied!' : 'Copy Code'}
            />

            <SidebarButton
              onClick={onShare}
              disabled={shareLoading || !hasCode}
              variant="twitter"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                </svg>
              }
              tooltip="Share on X"
            />
          </div>

          {/* Divider */}
          <div className="w-10 h-px bg-gradient-to-r from-transparent via-[#333] to-transparent my-1"></div>

          {/* Deploy/Export Actions */}
          <div className="flex flex-col gap-1.5 w-full px-2">
            <SidebarButton
              onClick={onVercelDeploy}
              disabled={!hasCode}
              variant="vercel"
              icon={<span className="text-lg font-bold">▲</span>}
              tooltip="Deploy to Vercel"
            />

            <SidebarButton
              onClick={onRailwayDeploy}
              disabled={!hasCode}
              variant="railway"
              icon={<span className="text-lg">🚀</span>}
              tooltip="Deploy to Railway"
            />

            <SidebarButton
              onClick={onGitHubExport}
              disabled={!hasCode}
              variant="github"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              }
              tooltip="Export to GitHub"
            />

            {onPWAExport && (
              <SidebarButton
                onClick={onPWAExport}
                disabled={!hasCode}
                variant="primary"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                }
                tooltip="Export as PWA"
              />
            )}

            {onComponentLibrary && (
              <SidebarButton
                onClick={onComponentLibrary}
                variant="primary"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                }
                tooltip="Component Library"
              />
            )}

            {onVersionHistory && (
              <SidebarButton
                onClick={onVersionHistory}
                variant="primary"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                tooltip="Version History"
              />
            )}

            {onTemplateMarketplace && (
              <SidebarButton
                onClick={onTemplateMarketplace}
                variant="primary"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                }
                tooltip="Template Marketplace"
              />
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Divider */}
          <div className="w-10 h-px bg-gradient-to-r from-transparent via-[#333] to-transparent my-1"></div>

          {/* User Actions */}
          <div className="flex flex-col gap-1.5 w-full px-2">
            {subscriptionStatus === 'free' && (
              <SidebarButton
                onClick={onUpgrade}
                variant="upgrade"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                }
                tooltip="Upgrade to Pro"
              />
            )}

            {subscriptionStatus === 'pro' && (
              <div className="p-2.5 bg-gradient-to-br from-[#0066cc]/20 to-[#0066cc]/5 rounded-xl border border-[#0066cc]/30 flex items-center justify-center">
                <span className="text-[#0066cc] text-[10px] font-bold">PRO</span>
              </div>
            )}

            {/* User Info Toggle */}
            <div className="relative">
              <SidebarButton
                onClick={() => setShowUserInfo(!showUserInfo)}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                tooltip="User Info"
              />

              {/* User Info Panel */}
              {showUserInfo && (
                <div className="absolute left-full ml-3 bottom-0 p-4 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-2xl shadow-2xl min-w-[220px] z-50 border border-[#2a2a2a]">
                  <div className="space-y-3 text-xs">
                    {userEmail && (
                      <div className="text-gray-300 truncate max-w-[200px] font-medium">
                        {userEmail}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                        <div className="text-gray-500 text-[10px] mb-0.5">Credits</div>
                        <div className={`font-semibold ${userCredits < 1 ? 'text-red-400' : 'text-[#0066cc]'}`}>
                          {userCredits.toFixed(1)}
                        </div>
                      </div>
                      <div className="p-2 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                        <div className="text-gray-500 text-[10px] mb-0.5">Gens Left</div>
                        <div className={`font-semibold ${
                          rateLimitRemaining === 0 ? 'text-yellow-400' : rateLimitRemaining <= 2 ? 'text-orange-400' : 'text-blue-400'
                        }`}>
                          {rateLimitRemaining}
                        </div>
                      </div>
                    </div>
                    <div className="p-2 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                      <div className="text-gray-500 text-[10px] mb-0.5">Referrals</div>
                      <div className="text-purple-400 font-semibold">{referralCount}</div>
                    </div>
                    {subscriptionStatus === 'pro' && (
                      <div className="pt-2 border-t border-[#2a2a2a]">
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-white transition-colors">
                          <input
                            type="checkbox"
                            checked={brandingEnabled}
                            onChange={(e) => onBrandingToggle(e.target.checked)}
                            className="rounded border-[#444] bg-transparent accent-[#0066cc]"
                          />
                          <span>Show branding</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <SidebarButton
              onClick={onSignOut}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              }
              tooltip="Sign Out"
            />
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

// Reusable Sidebar Button Component
function SidebarButton({
  onClick,
  disabled,
  icon,
  tooltip,
  variant = 'default',
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip: string;
  variant?: 'default' | 'primary' | 'success' | 'twitter' | 'vercel' | 'railway' | 'github' | 'upgrade';
}) {
  const variantClasses = {
    default: 'bg-[#1a1a1a] hover:bg-[#252525] border-[#2a2a2a] hover:border-[#444] text-white',
    primary: 'bg-gradient-to-br from-[#0066cc] to-[#3498db] hover:from-[#2980b9] hover:to-[#ff9f6a] border-transparent text-white shadow-lg shadow-[#0066cc]/20',
    success: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-transparent text-white',
    twitter: 'bg-gradient-to-br from-[#1DA1F2] to-[#0d8ddb] hover:from-[#1a8cd8] hover:to-[#0b7bc2] border-transparent text-white',
    vercel: 'bg-black hover:bg-gray-900 border-[#333] text-white',
    railway: 'bg-[#0B0D0E] hover:bg-[#1a1d1f] border-[#2a2a2a] text-white',
    github: 'bg-[#24292e] hover:bg-[#2f363d] border-[#333] text-white',
    upgrade: 'bg-gradient-to-br from-[#0066cc] to-[#2980b9] hover:from-[#2980b9] hover:to-[#ffa347] border-transparent text-white shadow-lg shadow-[#0066cc]/30 animate-pulse',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2.5 rounded-xl border transition-all group relative
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
      `}
      title={tooltip}
    >
      {icon}
      <span className="absolute left-full ml-3 px-3 py-1.5 bg-[#1a1a1a] text-white text-xs rounded-lg border border-[#2a2a2a] opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-lg z-50 -translate-x-1 group-hover:translate-x-0">
        {tooltip}
      </span>
    </button>
  );
}
