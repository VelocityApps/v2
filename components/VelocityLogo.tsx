'use client';

interface VelocityLogoProps {
  iconSize?: number;
  showText?: boolean;
  layout?: 'row' | 'column';
  textClassName?: string;
  className?: string;
}

/**
 * VelocityApps logo mark.
 *
 * Icon: a two-tone V with the right arm terminating in an upward arrow.
 *  – Left arm:  deep blue  (#1d4ed8) — grounded, solid
 *  – Right arm: bright blue (#60a5fa) with arrowhead — velocity, upward momentum
 *
 * Design follows modern SaaS conventions:
 *  – No gradients (single solid colors scale cleanly to favicon sizes)
 *  – Stroke-based paths so the mark reads at 16 px and 256 px equally
 *  – Title-case wordmark with colour split ("Velocity" white / "Apps" blue)
 */
export default function VelocityLogo({
  iconSize = 32,
  showText = true,
  layout = 'row',
  textClassName = 'text-xl font-semibold',
  className = '',
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
        {/* Left arm — deep blue, rounds at both ends for a clean stroke */}
        <line
          x1="8"
          y1="10"
          x2="34"
          y2="60"
          stroke="#1d4ed8"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Right arm shaft — bright blue */}
        <line
          x1="34"
          y1="60"
          x2="52"
          y2="16"
          stroke="#60a5fa"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/*
          Arrowhead — aligned with the right arm direction.
          Arm vector: (52-34, 16-60) = (18, -44). Unit ≈ (0.38, -0.92).
          Perpendicular: (0.92, 0.38).
          Tip:       (52 + 10×0.38,  16 - 10×0.92) ≈ (56, 7)
          Left wing: (52 -  9×0.92,  16 -  9×0.38) ≈ (44, 13)
          Right wing:(52 +  9×0.92,  16 +  9×0.38) ≈ (60, 19)
        */}
        <polygon points="44,13 60,19 56,7" fill="#60a5fa" />
      </svg>

      {/* Wordmark */}
      {showText && layout === 'row' && (
        <span className={`tracking-tight leading-none ${textClassName}`}>
          <span className="text-white">Velocity</span>
          <span className="text-[#60a5fa]">Apps</span>
        </span>
      )}
      {showText && layout === 'column' && (
        <div className={`text-center tracking-tight ${textClassName}`}>
          <div className="text-white leading-tight">Velocity</div>
          <div className="text-[#60a5fa] leading-tight">Apps</div>
        </div>
      )}
    </div>
  );
}
