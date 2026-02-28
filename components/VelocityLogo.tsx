'use client';

interface VelocityLogoProps {
  iconSize?: number;
  showText?: boolean;
  layout?: 'row' | 'column';
  textClassName?: string;
  className?: string;
}

export default function VelocityLogo({
  iconSize = 32,
  showText = true,
  layout = 'row',
  textClassName = 'text-xl font-bold',
  className = '',
}: VelocityLogoProps) {
  return (
    <div
      className={`flex ${layout === 'row' ? 'flex-row items-center gap-3' : 'flex-col items-center gap-3'} ${className}`}
    >
      {/* V lightning icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient
            id="va-logo-g"
            x1="36"
            y1="8"
            x2="36"
            y2="64"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#00bcd4" />
            <stop offset="50%" stopColor="#00ff88" />
            <stop offset="100%" stopColor="#32cd32" />
          </linearGradient>
        </defs>
        {/* Thick V / lightning bolt mark */}
        <path
          d="M 8 8 L 36 64 L 64 8 L 52 8 L 36 47 L 20 8 Z"
          fill="url(#va-logo-g)"
        />
      </svg>

      {/* Wordmark */}
      {showText && layout === 'row' && (
        <span className={`text-white ${textClassName}`}>
          VELOCITY{' '}
          <span className="bg-gradient-to-r from-[#00bcd4] to-[#32cd32] bg-clip-text text-transparent">
            APPS
          </span>
        </span>
      )}
      {showText && layout === 'column' && (
        <div className={`text-center text-white ${textClassName}`}>
          <div className="leading-tight">VELOCITY</div>
          <div className="leading-tight bg-gradient-to-r from-[#00bcd4] to-[#32cd32] bg-clip-text text-transparent">
            APPS
          </div>
        </div>
      )}
    </div>
  );
}
