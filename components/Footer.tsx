import Link from 'next/link';
import VelocityLogo from './VelocityLogo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#f6f6f7] border-t border-[#e1e3e5] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <VelocityLogo iconSize={32} textClassName="text-lg font-bold" darkText />
            </Link>
            <p className="text-[#6d7175] text-sm leading-relaxed max-w-sm">
              Pre-built automations for Shopify stores. Install in seconds, run forever.
              No code required.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-[#202223] font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/marketplace" className="text-[#6d7175] hover:text-[#2563eb] transition-colors text-sm">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-[#6d7175] hover:text-[#2563eb] transition-colors text-sm">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-[#6d7175] hover:text-[#2563eb] transition-colors text-sm">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[#202223] font-semibold text-sm mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/terms" className="text-[#6d7175] hover:text-[#2563eb] transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-[#6d7175] hover:text-[#2563eb] transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#e1e3e5] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[#8c9196] text-sm">
            © {currentYear} VelocityApps Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#008060]"></span>
            <span className="text-[#8c9196] text-sm">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
