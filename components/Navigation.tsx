'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SupportTicketModal from './SupportTicketModal';
import VelocityLogo from './VelocityLogo';

export default function Navigation() {
  const { session, user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    setUserMenuOpen(false);
  };

  const navLinks = [
    { href: '/marketplace', label: 'Marketplace' },
    ...(session ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
    { href: '/support', label: 'Support' },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu')) setUserMenuOpen(false);
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-[#e1e3e5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <VelocityLogo iconSize={32} textClassName="text-lg font-bold hidden sm:block" darkText />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors pb-0.5 ${
                  isActive(link.href)
                    ? 'text-[#2563eb] border-b-2 border-[#2563eb]'
                    : 'text-[#6d7175] hover:text-[#202223]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {session ? (
              <>
                {/* User menu — desktop */}
                <div className="hidden md:block relative user-menu">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e1e3e5] hover:border-[#c9cccf] bg-white transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2563eb] to-[#60a5fa] flex items-center justify-center text-white text-xs font-semibold">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-[#202223] text-sm hidden lg:block max-w-[140px] truncate">
                      {user?.email}
                    </span>
                    <svg
                      className={`w-4 h-4 text-[#6d7175] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-[#e1e3e5] rounded-xl shadow-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#e1e3e5] bg-[#f6f6f7]">
                        <p className="text-xs text-[#6d7175]">Signed in as</p>
                        <p className="text-sm font-medium text-[#202223] truncate">{user?.email}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#202223] hover:bg-[#f6f6f7] transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => { setSupportModalOpen(true); setUserMenuOpen(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#202223] hover:bg-[#f6f6f7] transition-colors"
                      >
                        Support
                      </button>
                      <div className="border-t border-[#e1e3e5]">
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#d72c0d] hover:bg-[#fff4f4] transition-colors"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Avatar — mobile */}
                <Link
                  href="/dashboard"
                  className="md:hidden w-8 h-8 rounded-full bg-gradient-to-br from-[#2563eb] to-[#60a5fa] flex items-center justify-center text-white text-sm font-semibold"
                >
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/onboarding"
                  className="hidden sm:block text-sm font-medium text-[#6d7175] hover:text-[#202223] transition-colors px-3 py-2"
                >
                  Sign in
                </Link>
                <Link
                  href="/onboarding"
                  className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                >
                  Get started
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#6d7175] hover:bg-[#f6f6f7] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#e1e3e5] py-3">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-[#f0f7ff] text-[#2563eb]'
                      : 'text-[#202223] hover:bg-[#f6f6f7]'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {session && (
                <>
                  <button
                    onClick={() => { setSupportModalOpen(true); setMobileMenuOpen(false); }}
                    className="px-3 py-2 text-left rounded-lg text-sm font-medium text-[#202223] hover:bg-[#f6f6f7] transition-colors"
                  >
                    Contact Support
                  </button>
                  <div className="border-t border-[#e1e3e5] mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="px-3 py-2 text-left rounded-lg text-sm font-medium text-[#d72c0d] hover:bg-[#fff4f4] w-full transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <SupportTicketModal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} />
    </nav>
  );
}
