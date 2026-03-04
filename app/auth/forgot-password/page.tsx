'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      const msg = error?.message || 'Failed to send password reset email';
      setErrorMessage(msg);
      toast.error(msg);
      if (msg.includes('recovery email') || msg.includes('sending')) {
        setErrorMessage(
          msg +
            ' — Check Supabase: Authentication → Email → SMTP Settings (custom SMTP on, Host/Port/Username/Password filled). See RESEND_SETUP.md.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#e1e3e5] rounded-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#202223] mb-2">Forgot Password?</h1>
            <p className="text-[#6d7175] text-sm">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#202223] mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-[#e3f9e3] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#008060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#202223]">Check Your Email</h2>
              <p className="text-[#6d7175] text-sm">
                We've sent a password reset link to <strong className="text-[#202223]">{email}</strong>
              </p>
              <p className="text-xs text-[#8c9196]">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors text-sm font-medium"
              >
                Send another email
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/onboarding"
              className="text-sm text-[#6d7175] hover:text-[#2563eb] transition-colors"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
