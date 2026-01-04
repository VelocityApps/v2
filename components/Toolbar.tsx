'use client';

import { useState, useEffect, useRef } from 'react';

interface ToolbarProps {
  // Primary Actions
  onHome?: () => void;
  onNewProject: () => void;
  onShare: () => void;
  onDeploy: () => void;
  onSave: () => void;
  saving: boolean;
  hasCode: boolean;
  saved: boolean;
  
  // Navigation
  onProjects: () => void;
  projectsOpen: boolean;
  onTemplates: () => void;
  onSettings: () => void;
  
  // User
  onFeedback: () => void;
  onProfile: () => void;
  userInitials?: string;
  
  // State
  subscriptionStatus: 'free' | 'pro' | 'teams' | 'cancelled';
}

export default function Toolbar({
  onHome,
  onNewProject,
  onShare,
  onDeploy,
  onSave,
  saving,
  hasCode,
  saved,
  onProjects,
  projectsOpen,
  onTemplates,
  onSettings,
  onFeedback,
  onProfile,
  userInitials,
  subscriptionStatus,
}: ToolbarProps) {
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.shiftKey && e.key === 'S') {
          e.preventDefault();
          if (hasCode) onShare();
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          onNewProject();
        } else if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          if (hasCode) onDeploy();
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          onProjects();
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          onTemplates();
        } else if (e.key === ',') {
          e.preventDefault();
          onSettings();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasCode, onNewProject, onShare, onDeploy, onProjects, onTemplates, onSettings]);

  const showTooltip = (tooltip: string) => {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    const timeout = setTimeout(() => setHoveredTooltip(tooltip), 500);
    setTooltipTimeout(timeout);
  };

  const hideTooltip = () => {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    setHoveredTooltip(null);
  };

  return (
    <div className="fixed left-0 top-0 h-full w-14 bg-gradient-to-b from-[#141414] to-[#0a0a0a] border-r border-[#2a2a2a] z-40 flex flex-col">
      {/* TOP SECTION - Dashboard */}
      <div className="flex flex-col gap-2 p-2 border-b border-[#2a2a2a]">
        {/* Dashboard/Home Button */}
        {onHome && (
          <ToolbarButton
            onClick={onHome}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            }
            tooltip="Dashboard"
            onMouseEnter={() => showTooltip('Dashboard')}
            onMouseLeave={hideTooltip}
            showTooltip={hoveredTooltip === 'Dashboard'}
          />
        )}

        {/* VelocityApps Text */}
        <div className="px-1 py-2">
          <div className="text-[10px] font-bold text-white text-center leading-tight">
            <div><span className="text-[#0a2463]">Velocity</span></div>
            <div><span className="text-[#3498db]">Apps</span></div>
          </div>
        </div>
      </div>

      {/* TOP SECTION - Primary Actions */}
      <div className="flex flex-col gap-2 p-2 border-b border-[#2a2a2a]">
        <ToolbarButton
          onClick={onNewProject}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
          tooltip="New Project (Cmd+N)"
          shortcut="Cmd+N"
          onMouseEnter={() => showTooltip('New Project (Cmd+N)')}
          onMouseLeave={hideTooltip}
          showTooltip={hoveredTooltip === 'New Project (Cmd+N)'}
        />

        <ToolbarButton
          onClick={onShare}
          disabled={!hasCode}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          }
          tooltip="Share Project (Cmd+Shift+S)"
          shortcut="Cmd+Shift+S"
          hasNotification={hasCode}
          active={false}
          onMouseEnter={() => showTooltip('Share Project (Cmd+Shift+S)')}
          onMouseLeave={hideTooltip}
          showTooltip={hoveredTooltip === 'Share Project (Cmd+Shift+S)'}
        />

        <ToolbarButton
          onClick={onDeploy}
          disabled={!hasCode}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          tooltip="Deploy (Cmd+D)"
          shortcut="Cmd+D"
          onMouseEnter={() => showTooltip('Deploy (Cmd+D)')}
          onMouseLeave={hideTooltip}
          showTooltip={hoveredTooltip === 'Deploy (Cmd+D)'}
        />

        <ToolbarButton
          onClick={onSave}
          disabled={saving || !hasCode}
          icon={
            saving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin block"></span>
            ) : saved ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )
          }
          tooltip={saving ? 'Saving...' : saved ? 'Saved' : 'Save Project'}
          onMouseEnter={() => showTooltip(saved ? 'Saved' : 'Save Project')}
          onMouseLeave={hideTooltip}
          showTooltip={hoveredTooltip === (saved ? 'Saved' : 'Save Project')}
        />
      </div>

      {/* MIDDLE SECTION - Navigation */}
      <div className="flex flex-col gap-2 p-2 border-b border-[#2a2a2a] flex-1">
        <ToolbarButton
          onClick={onProjects}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
          tooltip="Projects (Cmd+P)"
          shortcut="Cmd+P"
          active={projectsOpen}
          onMouseEnter={() => showTooltip('Projects (Cmd+P)')}
          onMouseLeave={hideTooltip}
          showTooltip={hoveredTooltip === 'Projects (Cmd+P)'}
        />

        <ToolbarButton
          onClick={onTemplates}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          }
          tooltip="Templates (Cmd+T)"
          shortcut="Cmd+T"
          onMouseEnter={() => showTooltip('Templates (Cmd+T)')}
          onMouseLeave={hideTooltip}
          showTooltip={hoveredTooltip === 'Templates (Cmd+T)'}
        />

        <ToolbarButton
          onClick={onSettings}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          tooltip="Settings (Cmd+,)"
          shortcut="Cmd+,"
          onMouseEnter={() => showTooltip('Settings (Cmd+,)')}
          onMouseLeave={hideTooltip}
          showTooltip={hoveredTooltip === 'Settings (Cmd+,)'}
        />
      </div>

      {/* BOTTOM SECTION - User */}
      <div className="flex flex-col gap-2 p-2">
        <ToolbarButton
          onClick={onFeedback}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
          tooltip="Feedback"
          variant="primary"
          onMouseEnter={() => showTooltip('Feedback')}
          onMouseLeave={hideTooltip}
          showTooltip={hoveredTooltip === 'Feedback'}
        />

        <ToolbarButton
          onClick={onProfile}
          icon={
            userInitials ? (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#0066cc] to-[#3498db] flex items-center justify-center text-white text-[10px] font-semibold">
                {userInitials}
              </div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )
          }
          tooltip="Profile & Billing"
          onMouseEnter={() => showTooltip('Profile & Billing')}
          onMouseLeave={hideTooltip}
          showTooltip={hoveredTooltip === 'Profile & Billing'}
        />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip: string;
  shortcut?: string;
  hasNotification?: boolean;
  active?: boolean;
  variant?: 'default' | 'primary';
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  showTooltip: boolean;
}

function ToolbarButton({
  onClick,
  disabled,
  icon,
  tooltip,
  shortcut,
  hasNotification,
  active,
  variant = 'default',
  onMouseEnter,
  onMouseLeave,
  showTooltip,
}: ToolbarButtonProps) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`
          w-10 h-10 rounded-xl flex items-center justify-center transition-all
          ${variant === 'primary' 
            ? 'bg-gradient-to-br from-[#0066cc] to-[#3498db] text-white hover:from-[#2980b9] hover:to-[#5dade2]' 
            : 'bg-transparent hover:bg-white/10 text-gray-400 hover:text-white'
          }
          ${active ? 'bg-white/10 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] scale-105' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-[#0066cc]/50
        `}
        aria-label={tooltip}
      >
        {icon}
        {hasNotification && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#0066cc] rounded-full border-2 border-[#0a0a0a]"></span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1.5 bg-gray-900 text-white text-xs rounded-lg border border-gray-700 shadow-xl z-50 whitespace-nowrap pointer-events-none">
          <div>{tooltip}</div>
          {shortcut && (
            <div className="text-gray-400 text-[10px] mt-0.5">{shortcut}</div>
          )}
        </div>
      )}
    </div>
  );
}

