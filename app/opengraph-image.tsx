import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VelocityApps – Shopify Automation Marketplace';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// V-arrow icon mark — same geometry as VelocityLogo.tsx
const ICON_SVG = [
  '<svg width="140" height="140" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<line x1="8" y1="10" x2="34" y2="60" stroke="#1d4ed8" stroke-width="12" stroke-linecap="round"/>',
  '<line x1="34" y1="60" x2="52" y2="16" stroke="#60a5fa" stroke-width="12" stroke-linecap="round"/>',
  '<polygon points="44,13 60,19 56,7" fill="#60a5fa"/>',
  '</svg>',
].join('');

const ICON_SRC = `data:image/svg+xml;base64,${btoa(ICON_SVG)}`;

const PILLS = [
  'Abandoned Cart Recovery',
  'Low Stock Alerts',
  'Review Requests',
  'Best Sellers',
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Subtle radial glow ── */}
        <div
          style={{
            position: 'absolute',
            width: 800,
            height: 800,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at center, rgba(29,78,216,0.18) 0%, rgba(96,165,250,0.06) 45%, transparent 70%)',
            top: -85,
            left: 200,
            display: 'flex',
          }}
        />

        {/* ── Decorative grid lines (top-left corner) ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 320,
            height: 320,
            opacity: 0.06,
            backgroundImage:
              'linear-gradient(#60a5fa 1px, transparent 1px), linear-gradient(90deg, #60a5fa 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            display: 'flex',
          }}
        />

        {/* ── V-arrow icon ── */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ICON_SRC}
          width={140}
          height={140}
          alt=""
          style={{ marginBottom: 24 }}
        />

        {/* ── Wordmark ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            marginBottom: 18,
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-2px',
            }}
          >
            Velocity
          </span>
          <span
            style={{
              color: '#60a5fa',
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-2px',
            }}
          >
            Apps
          </span>
        </div>

        {/* ── Tagline ── */}
        <div
          style={{
            color: '#6b7280',
            fontSize: 26,
            marginBottom: 52,
            display: 'flex',
            letterSpacing: '0.5px',
          }}
        >
          Shopify Automation Marketplace · Zero code required
        </div>

        {/* ── Feature pills ── */}
        <div style={{ display: 'flex', gap: 14 }}>
          {PILLS.map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                background: '#0f172a',
                border: '1px solid #1e3a8a',
                borderRadius: 999,
                padding: '10px 22px',
                color: '#93c5fd',
                fontSize: 17,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* ── Domain badge ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            right: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Small accent dot */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
            }}
          />
          <span style={{ color: '#374151', fontSize: 20, display: 'flex' }}>
            velocityapps.dev
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
