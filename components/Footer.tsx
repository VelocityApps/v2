import Link from 'next/link';
import VelocityLogo from './VelocityLogo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <VelocityLogo iconSize={32} textClassName="text-lg font-bold" darkText />
            </Link>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-sm">
              Pre-built automations for Shopify stores. Install in seconds, run forever.
              No code required.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-[var(--text-primary)] font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-3">
              {[
                { href: '/marketplace', label: 'Marketplace' },
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/support', label: 'Support' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors text-sm">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[var(--text-primary)] font-semibold text-sm mb-4">Legal</h3>
            <ul className="space-y-3">
              {[
                { href: '/terms', label: 'Terms of Service' },
                { href: '/privacy', label: 'Privacy Policy' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors text-sm">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[var(--text-muted)] text-sm">
            © {currentYear} VelocityApps Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--success)]"></span>
            <span className="text-[var(--text-muted)] text-sm">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
