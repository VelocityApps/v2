'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Supabase email verification includes tokens in the URL hash
        const hash = window.location.hash || '';
        const hashParams = hash ? new URLSearchParams(hash.substring(1)) : null;
        const hasError = hashParams?.get('error') === 'access_denied' || hashParams?.get('error_code') === 'otp_expired';

        if (hasError || !hash || !hash.includes('access_token')) {
          if (hasError) {
            setStatus('expired');
            setError('This verification link has expired. Request a new one below.');
            setLoading(false);
            return;
          }
          // Check if there's a token in query params (some email clients strip hash)
          const token = searchParams.get('token');
          const type = searchParams.get('type');
          
          if (token && type === 'email') {
            // Try to verify with token from query params
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'email',
            });

            if (verifyError) throw verifyError;
            setStatus('success');
            toast.success('Email verified successfully!');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
            return;
          }

          setStatus('expired');
          setError('Invalid or expired verification link. Please request a new verification email.');
          return;
        }

        // Extract tokens from hash (hashParams already set above)
        const accessToken = hashParams!.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (!accessToken || type !== 'email') {
          setStatus('expired');
          setError('Invalid verification link.');
          return;
        }

        // Set the session with the tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) throw sessionError;

        setStatus('success');
        toast.success('Email verified successfully!');

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch (error: any) {
        console.error('Email verification error:', error);
        setStatus('error');
        setError(error.message || 'Failed to verify email. The link may have expired.');
        toast.error('Verification failed');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [router, searchParams]);

  const handleResendVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        toast.error('No user found. Please sign up again.');
        router.push('/onboarding');
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) throw error;

      toast.success('Verification email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    }
  };

  if (loading || status === 'verifying') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00bcd4] mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-white mb-2">Verifying Email...</h2>
            <p className="text-gray-400">Please wait while we verify your email address.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
            <p className="text-gray-400 mb-6">
              Your email has been successfully verified. Redirecting to your dashboard...
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-gradient-to-r from-[#00bcd4] to-[#32cd32] hover:from-[#00acc1] hover:to-[#2eb82e] text-white rounded-lg font-medium transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
          <p className="text-gray-400 mb-6">
            {error || 'The verification link is invalid or has expired.'}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleResendVerification}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#00bcd4] to-[#32cd32] hover:from-[#00acc1] hover:to-[#2eb82e] text-white rounded-lg font-medium transition-all"
            >
              Resend Verification Email
            </button>
            <Link
              href="/onboarding"
              className="block w-full px-6 py-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 rounded-lg font-medium transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
