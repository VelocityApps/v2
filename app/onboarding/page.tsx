'use client';

import { Suspense, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AutomationCard from '@/components/automations/AutomationCard';

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f6f7]" />}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const { session, loading: authLoading, signIn, signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'auth' | 'connect' | 'select' | 'complete'>('auth');
  const [shopifyStoreUrl, setShopifyStoreUrl] = useState('');
  const [topAutomations, setTopAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Auth form state (shown when not signed in)
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authFormLoading, setAuthFormLoading] = useState(false);

  useEffect(() => {
    const shopifySuccess = searchParams.get('shopify_auth_success');
    const shop = searchParams.get('shop');
    const shopifyError = searchParams.get('shopify_auth_error');

    if (shopifyError) {
      alert(`Shopify connection error: ${shopifyError}`);
      return;
    }

    if (shopifySuccess === '1' && shop) {
      // Read token from httpOnly cookie via server endpoint (cleared after one read)
      fetch('/api/auth/shopify/get-token')
        .then((res) => res.json())
        .then((data) => {
          if (data.token && data.shop) {
            sessionStorage.setItem('shopify_token', data.token);
            sessionStorage.setItem('shopify_shop', data.shop);
            setStep('select');
            fetchTopAutomations();
            // Clean URL without reloading
            window.history.replaceState({}, '', '/onboarding');
          } else {
            alert('Failed to retrieve Shopify token. Please try connecting again.');
          }
        })
        .catch(() => {
          alert('Failed to retrieve Shopify token. Please try connecting again.');
        });
    }
  }, [searchParams]);

  // When session is ready, move from auth step to connect (no redirect)
  useEffect(() => {
    if (!authLoading && session && step === 'auth') {
      setStep('connect');
    }
  }, [session, authLoading, step]);

  async function fetchTopAutomations() {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('active', true)
        .order('user_count', { ascending: false })
        .limit(3);

      if (!error) {
        setTopAutomations(data || []);
      }
    } catch (error) {
      console.error('Error fetching automations:', error);
    }
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthFormLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await signUp(email, password);
        if (error) {
          let msg = error.message;
          if (error.message.includes('User already registered') || error.message.includes('already registered')) {
            msg = 'An account with this email already exists. Try signing in instead.';
          } else if (error.message.includes('Password')) {
            msg = 'Password must be at least 6 characters long.';
          } else if (error.message.includes('Database error') || error.message.includes('saving new user') || error.message.includes('relation') || error.message.includes('does not exist')) {
            msg = 'Database setup needed: run the SQL in supabase/migrations/fix_signup_trigger.sql (or complete_setup.sql) in Supabase Dashboard → SQL Editor. See DATABASE_SETUP_QUICK.md.';
          }
          setAuthError(msg);
        } else if (data?.user) {
          if (data.session) {
            setAuthSuccess('Account created! Taking you to the next step...');
          } else {
            setAuthSuccess('Account created! Please check your email to confirm your account.');
            setEmail('');
            setPassword('');
          }
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          let msg = error.message;
          if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid credentials')) {
            msg = 'Invalid email or password.';
          } else if (error.message.includes('Email not confirmed')) {
            msg = 'Please check your email and confirm your account before signing in.';
          }
          setAuthError(msg);
        } else {
          setAuthSuccess('Signed in! Taking you to the next step...');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Something went wrong');
    } finally {
      setAuthFormLoading(false);
    }
  };

  const handleConnectShopify = async () => {
    if (!shopifyStoreUrl) {
      alert('Please enter your Shopify store URL');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/auth/shopify/authorize?shop=${encodeURIComponent(shopifyStoreUrl)}&source=onboarding`
      );
      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      // Redirect to Shopify OAuth
      window.location.href = data.authUrl;
    } catch (error: any) {
      alert(error.message || 'Failed to connect Shopify store');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563eb]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#202223]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#202223] mb-3">Welcome to VelocityApps</h1>
          <p className="text-[#6d7175] text-lg">
            {step === 'auth'
              ? 'Sign in or create an account to get started'
              : "Let's get your Shopify store set up with automations"}
          </p>
        </div>

        {step === 'auth' && !session && (
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-8 max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-[#202223] mb-6">Sign in or sign up</h2>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors"
                  placeholder="••••••••"
                />
              </div>
              {authError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
                  {authError}
                </div>
              )}
              {authSuccess && (
                <div className="p-3 rounded-lg bg-[#e3f9e3] text-[#008060] border border-[#a3e6c4] text-sm">
                  {authSuccess}
                </div>
              )}
              {isSignUp && (
                <p className="text-xs text-[#6d7175]">
                  By signing up, you agree to our{' '}
                  <Link href="/terms" className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors">Privacy Policy</Link>.
                </p>
              )}
              <button
                type="submit"
                disabled={authFormLoading}
                className="w-full px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-sm"
              >
                {authFormLoading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>
            <div className="mt-4 space-y-2 text-center">
              {!isSignUp && (
                <Link href="/auth/forgot-password" className="block text-sm text-[#6d7175] hover:text-[#2563eb] transition-colors">
                  Forgot password?
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className="text-sm text-[#6d7175] hover:text-[#2563eb] transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        )}

        {(step === 'connect' || (step === 'auth' && session)) && (
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-8 max-w-lg mx-auto">
            <h2 className="text-xl font-semibold text-[#202223] mb-2">Connect Your Shopify Store</h2>
            <p className="text-[#6d7175] text-sm mb-6">
              Connect your store to get started. We only request permissions each automation needs.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">
                  Shopify store URL
                </label>
                <input
                  type="text"
                  value={shopifyStoreUrl}
                  onChange={(e) => setShopifyStoreUrl(e.target.value)}
                  placeholder="mystore.myshopify.com"
                  className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors"
                />
              </div>
              <button
                onClick={handleConnectShopify}
                disabled={loading || !shopifyStoreUrl}
                className="w-full px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Connecting...' : 'Connect Shopify Store'}
              </button>
            </div>
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#e1e3e5] rounded-xl p-8">
              <h2 className="text-xl font-semibold text-[#202223] mb-2">Choose Your First Automation</h2>
              <p className="text-[#6d7175] text-sm">
                Pick one of our most popular automations to get started.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topAutomations.map((automation: any) => (
                <AutomationCard
                  key={automation.id}
                  automation={{
                    id: automation.id,
                    name: automation.name,
                    slug: automation.slug,
                    description: automation.description,
                    category: automation.category,
                    price_monthly: automation.price_monthly,
                    icon: automation.icon,
                    features: automation.features || [],
                    user_count: automation.user_count || 0,
                    config_schema: automation.config_schema || {},
                  }}
                  variant="marketplace"
                />
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push('/marketplace')}
                className="px-6 py-3 bg-white hover:bg-[#f6f6f7] border border-[#e1e3e5] text-[#202223] rounded-lg font-medium transition-colors"
              >
                Browse All Automations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



