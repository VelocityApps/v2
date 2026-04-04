'use client';

interface VelocityLogoProps {
  iconSize?: number;
  showText?: boolean;
  layout?: 'row' | 'column';
  textClassName?: string;
  className?: string;
  /** Use dark wordmark text — for light backgrounds */
  darkText?: boolean;
}

export default function VelocityLogo({
  iconSize = 32,
  showText = true,
  layout = 'row',
  textClassName = 'text-xl font-semibold',
  className = '',
  darkText = false,
}: VelocityLogoProps) {
  return (
    <div
      className={`flex ${
        layout === 'row' ? 'flex-row items-center gap-2' : 'flex-col items-center gap-2'
      } ${className}`}
    >
      {/* V-Arrow icon mark */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 68 68"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <line x1="8" y1="10" x2="34" y2="60" stroke="#1d4ed8" strokeWidth="12" strokeLinecap="round" />
        <line x1="34" y1="60" x2="52" y2="16" stroke="#60a5fa" strokeWidth="12" strokeLinecap="round" />
        <polygon points="44,13 60,19 56,7" fill="#60a5fa" />
      </svg>

      {showText && layout === 'row' && (
        <span className={`tracking-tight leading-none ${textClassName}`}>
          <span className={darkText ? 'text-[var(--text-primary)]' : 'text-white'}>Velocity</span>
          <span className="text-[#2563eb]">Apps</span>
        </span>
      )}
      {showText && layout === 'column' && (
        <div className={`text-center tracking-tight ${textClassName}`}>
          <div className={`leading-tight ${darkText ? 'text-[var(--text-primary)]' : 'text-white'}`}>Velocity</div>
          <div className="text-[#2563eb] leading-tight">Apps</div>
        </div>
      )}
    </div>
  );
}
