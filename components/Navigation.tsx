'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SupportTicketModal from './SupportTicketModal';

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
    { href: '/', label: 'Home' },
    { href: '/marketplace', label: 'Marketplace' },
    ...(session ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu')) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10">
              <svg width="40" height="40" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="navRingGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#00bcd4" stopOpacity={1} />
                    <stop offset="50%" stopColor="#00ff88" stopOpacity={1} />
                    <stop offset="100%" stopColor="#32cd32" stopOpacity={1} />
                  </linearGradient>
                </defs>
                {/* Outer gradient ring */}
                <circle cx="80" cy="80" r="56" fill="url(#navRingGradient)"/>
                {/* Inner dark teal circle */}
                <circle cx="80" cy="80" r="46" fill="#0a0a0a"/>
                {/* Upper V shape (orange, pointing down) */}
                <path d="M 56 48 L 80 28 L 104 48 Z" fill="#ff6600"/>
                {/* Lower V shape (teal, pointing up) */}
                <path d="M 56 112 L 80 132 L 104 112 Z" fill="#40e0d0"/>
              </svg>
            </div>
            <div className="text-xl font-bold hidden sm:block text-white">
              VELOCITY APPS
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-[#00bcd4] text-white'
                    : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side - Auth */}
          <div className="flex items-center gap-4">
            {session ? (
              <>
                {/* User Menu - Desktop */}
                <div className="hidden md:block relative user-menu">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00bcd4] to-[#32cd32] flex items-center justify-center text-white text-sm font-semibold">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-gray-300 text-sm hidden lg:block max-w-[150px] truncate">
                      {user?.email}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#2a2a2a]">
                        <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#222] transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          setSupportModalOpen(true);
                          setUserMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222] transition-colors"
                      >
                        Support
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222] transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* User Avatar - Mobile */}
                <Link
                  href="/dashboard"
                  className="md:hidden w-8 h-8 rounded-full bg-gradient-to-br from-[#00bcd4] to-[#32cd32] flex items-center justify-center text-white text-sm font-semibold"
                >
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/onboarding"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:block"
                >
                  Sign In
                </Link>
                <Link
                  href="/onboarding"
                  className="px-4 py-2 bg-gradient-to-r from-[#00bcd4] to-[#32cd32] hover:from-[#00acc1] hover:to-[#2eb82e] text-white rounded-lg font-medium text-sm transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-[#1a1a1a] hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-[#2a2a2a] mt-2 pt-4">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-[#0066cc] text-white'
                      : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {session && (
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-left rounded-lg font-medium text-gray-300 hover:bg-[#1a1a1a] hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <SupportTicketModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />
    </nav>
  );
}

