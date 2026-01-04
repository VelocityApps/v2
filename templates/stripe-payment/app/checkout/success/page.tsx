'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Checkout Success Page
 * 
 * Displays confirmation after successful payment.
 */
export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // You can verify the session here if needed
    if (sessionId) {
      // Example: fetch(`/api/verify-session?session_id=${sessionId}`)
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-400">
            Thank you for your purchase. Your payment has been processed successfully.
          </p>
        </div>

        {sessionId && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">Session ID</p>
            <p className="text-xs text-gray-500 font-mono break-all">{sessionId}</p>
          </div>
        )}

        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="block w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="block w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            Return Home
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            A confirmation email has been sent to your email address.
          </p>
        </div>
      </div>
    </div>
  );
}

