import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0a0a0a] border-t border-[#2a2a2a] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10">
                <svg width="40" height="40" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="footerRingGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="#00bcd4" stopOpacity={1} />
                      <stop offset="50%" stopColor="#00ff88" stopOpacity={1} />
                      <stop offset="100%" stopColor="#32cd32" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <circle cx="80" cy="80" r="56" fill="url(#footerRingGradient)"/>
                  <circle cx="80" cy="80" r="46" fill="#0a0a0a"/>
                  <path d="M 56 48 L 80 28 L 104 48 Z" fill="#ff6600"/>
                  <path d="M 56 112 L 80 132 L 104 112 Z" fill="#40e0d0"/>
                </svg>
              </div>
              <div className="text-xl font-bold text-white">
                VELOCITY APPS
              </div>
            </Link>
            <p className="text-gray-400 text-sm max-w-md">
              Shopify automations that just work. Automate your store with powerful, pre-built automations.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/marketplace" className="text-gray-400 hover:text-[#00bcd4] transition-colors text-sm">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-[#00bcd4] transition-colors text-sm">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-gray-400 hover:text-[#00bcd4] transition-colors text-sm">
                  Features
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-[#00bcd4] transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-[#00bcd4] transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-gray-400 hover:text-[#00bcd4] transition-colors text-sm">
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[#2a2a2a] flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © {currentYear} VelocityApps. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <Link href="/terms" className="text-gray-500 hover:text-[#00bcd4] transition-colors text-sm">
              Terms
            </Link>
            <Link href="/privacy" className="text-gray-500 hover:text-[#00bcd4] transition-colors text-sm">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
