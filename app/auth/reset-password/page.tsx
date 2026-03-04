'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkValid, setLinkValid] = useState<boolean | null>(null);

  useEffect(() => {
    const hash = window.location.hash || '';
    const hashParams = hash ? new URLSearchParams(hash.substring(1)) : null;
    const hasError = hashParams?.get('error') === 'access_denied' || hashParams?.get('error_code') === 'otp_expired';
    const hasToken = hash.includes('access_token');

    if (hasError || !hash || !hasToken) {
      setLinkValid(false);
      if (hasError) setError('This reset link has expired. Request a new one below.');
      else setError('Invalid or expired reset link. Please request a new password reset.');
    } else {
      setLinkValid(true);
      setError(null);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken) {
        throw new Error('Invalid reset link. Please request a new password reset.');
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (sessionError) throw sessionError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      toast.success('Password reset successfully! Redirecting to sign in...');
      setTimeout(() => { router.push('/onboarding'); }, 2000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to reset password. The link may have expired.');
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-[#e3f9e3] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#008060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#202223] mb-2">Password Reset Successful!</h2>
            <p className="text-[#6d7175] text-sm mb-6">
              Your password has been updated. Redirecting to sign in...
            </p>
            <Link
              href="/onboarding"
              className="inline-block px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold transition-colors shadow-sm"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (linkValid === false) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#202223] mb-2">Invalid or Expired Link</h2>
            <p className="text-[#6d7175] text-sm mb-6">{error}</p>
            <Link
              href="/auth/forgot-password"
              className="inline-block px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold transition-colors shadow-sm"
            >
              Request New Reset Link
            </Link>
            <div className="mt-4">
              <Link href="/onboarding" className="text-sm text-[#6d7175] hover:text-[#2563eb] transition-colors">
                ← Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (linkValid === null) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563eb] mx-auto mb-4"></div>
          <p className="text-[#6d7175] text-sm">Checking reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#e1e3e5] rounded-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#202223] mb-2">Reset Password</h1>
            <p className="text-[#6d7175] text-sm">
              Enter your new password below.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" aria-label="Reset password form">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#202223] mb-1.5">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-[#8c9196]">Must be at least 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#202223] mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-[#6d7175] hover:text-[#2563eb] transition-colors"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
