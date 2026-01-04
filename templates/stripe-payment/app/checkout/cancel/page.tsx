'use client';

import Link from 'next/link';

/**
 * Checkout Cancel Page
 * 
 * Displays message when user cancels checkout.
 */
export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-4">
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Payment Cancelled
          </h1>
          <p className="text-gray-400">
            Your payment was cancelled. No charges were made.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/pricing"
            className="block w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Try Again
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
            If you have any questions, please{' '}
            <a href="mailto:support@example.com" className="text-blue-400 hover:text-blue-300">
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

