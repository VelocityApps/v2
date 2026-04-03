'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

/**
 * /shopify/embed-init
 *
 * The landing page after Shopify's OAuth callback when the merchant installs
 * from the App Store. Runs inside the Shopify admin iframe.
 *
 * Responsibilities:
 *  1. Persist host + shop to sessionStorage for App Bridge and navigation.
 *  2. If merchant already has a Supabase session → go straight to dashboard.
 *  3. If not → show a lightweight sign-in / sign-up form.
 */
export default function EmbedInitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: authLoading } = useAuth();

  const host = searchParams.get('host') ?? '';
  const shop = searchParams.get('shop') ?? '';

  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Persist host/shop so deeper embedded pages can read them without URL params
  useEffect(() => {
    if (host) sessionStorage.setItem('shopify_host', host);
    if (shop) sessionStorage.setItem('shopify_shop', shop);
  }, [host, shop]);

  // Redirect authenticated merchants straight to the embedded dashboard
  useEffect(() => {
    if (!authLoading && session) {
      const dest = `/shopify/dashboard${host ? `?host=${encodeURIComponent(host)}&shop=${encodeURIComponent(shop)}` : ''}`;
      router.replace(dest);
    }
  }, [session, authLoading, router, host, shop]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Account created! Check your email to verify, then sign in.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // useEffect above will handle the redirect once session is set
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Already authenticated — redirect effect above will fire; show spinner meanwhile
  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">⚡</div>
          <h1 className="text-xl font-bold text-gray-900">VelocityApps</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'signup'
              ? 'Create an account to get started'
              : 'Sign in to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="you@yourstore.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {submitting
              ? 'Please wait…'
              : mode === 'signup'
              ? 'Create account'
              : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
            className="text-blue-600 hover:underline font-medium"
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>

        <p className="text-center text-xs text-gray-400 mt-4">
          Connected store: <span className="font-mono">{shop || 'unknown'}</span>
        </p>
      </div>
    </div>
  );
}
