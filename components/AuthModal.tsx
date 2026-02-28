'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await signUp(email, password);
        
        if (error) {
          // Provide more helpful error messages
          let errorMessage = error.message;
          
          // Check for common Supabase errors
          if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
            errorMessage = 'Invalid API key. Please check your Supabase configuration.';
          } else if (error.message.includes('Email rate limit')) {
            errorMessage = 'Too many signup attempts. Please wait a few minutes.';
          } else if (error.message.includes('User already registered') || error.message.includes('already registered')) {
            errorMessage = 'An account with this email already exists. Try signing in instead.';
          } else if (error.message.includes('Password')) {
            errorMessage = 'Password must be at least 6 characters long.';
          } else if (error.message.includes('Database error') || error.message.includes('relation') || error.message.includes('does not exist')) {
            errorMessage = 'Database not set up. Please run the SQL migration in Supabase Dashboard → SQL Editor. See DATABASE_SETUP.md for instructions.';
          }
          
          setError(errorMessage);
          setSuccess(null);
        } else {
          // Check if user was created and if session exists
          if (data?.user) {
            if (data.session) {
              // User is immediately signed in (email confirmation disabled)
              console.log('[AuthModal] Signup successful, user signed in');
              setSuccess('Account created successfully!');
              setError(null);
              // Wait a moment for auth state to update, then close
              setTimeout(() => {
                setEmail('');
                setPassword('');
              }, 1000);
            } else {
              // User created but needs email confirmation
              console.log('[AuthModal] Signup successful, email confirmation required');
              setSuccess('Account created! Please check your email to confirm your account.');
              setError(null);
              setEmail('');
              setPassword('');
            }
          } else {
            setError('Signup failed. Please try again.');
            setSuccess(null);
          }
        }
      } else {
        const { error } = await signIn(email, password);
        
        if (error) {
          let errorMessage = error.message;
          
          if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
            errorMessage = 'Invalid API key. Please check your Supabase configuration.';
          } else if (error.message.includes('Email rate limit')) {
            errorMessage = 'Too many signup attempts. Please wait a few minutes.';
          } else if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid credentials')) {
            errorMessage = 'Invalid email or password.';
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and confirm your account before signing in.';
          }
          
          setError(errorMessage);
          setSuccess(null);
        } else {
          // Sign in successful
          console.log('[AuthModal] Sign in successful');
          setEmail('');
          setPassword('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff6b35] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff6b35] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-900/30 text-red-300 border border-red-500/50 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-green-900/30 text-green-300 border border-green-500/50 text-sm">
              {success}
            </div>
          )}

          {isSignUp && (
            <div className="text-xs text-gray-500 text-center">
              By signing up, you agree to our{' '}
              <Link href="/terms" onClick={onClose} className="text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" onClick={onClose} className="text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
                Privacy Policy
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-[#ff6b35] hover:bg-[#ff7b45] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 space-y-2 text-center">
          {!isSignUp && (
            <Link
              href="/auth/forgot-password"
              onClick={onClose}
              className="block text-sm text-gray-400 hover:text-[#3b82f6] transition-colors"
            >
              Forgot password?
            </Link>
          )}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccess(null);
            }}
            className="text-sm text-gray-400 hover:text-[#ff6b35] transition-colors"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

