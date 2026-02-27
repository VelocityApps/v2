'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function TestPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  const testEmail = async () => {
    setLoading('email');
    try {
      const response = await fetch('/api/test/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'test@example.com' }),
      });
      const data = await response.json();
      setResults(prev => ({ ...prev, email: data }));
      if (data.success) {
        toast.success('Test email sent successfully!');
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (error: any) {
      setResults(prev => ({ ...prev, email: { error: error.message } }));
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const testDatabase = async () => {
    setLoading('database');
    try {
      const response = await fetch('/api/test/database');
      const data = await response.json();
      setResults(prev => ({ ...prev, database: data }));
      if (data.success) {
        toast.success('Database connection successful!');
      } else {
        toast.error(data.error || 'Database connection failed');
      }
    } catch (error: any) {
      setResults(prev => ({ ...prev, database: { error: error.message } }));
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">VelocityApps - Test Page</h1>
        <p className="text-gray-400 mb-8">Test your email and database connections</p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Email Test */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Email Test</h2>
            <p className="text-gray-400 mb-4">
              Test your SMTP configuration by sending a test email.
            </p>
            <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-700 rounded text-xs text-yellow-300">
              ⏳ Optional - Can be configured later. Not required for Day 1.
            </div>
            <button
              onClick={testEmail}
              disabled={loading === 'email'}
              className="w-full bg-gradient-to-r from-teal-500 to-lime-500 text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading === 'email' ? 'Sending...' : 'Send Test Email'}
            </button>
            {results.email && (
              <div className="mt-4 p-4 bg-gray-700 rounded text-sm">
                <pre className="whitespace-pre-wrap text-green-400">
                  {JSON.stringify(results.email, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Database Test */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Database Test</h2>
            <p className="text-gray-400 mb-4">
              Test your Supabase database connection.
            </p>
            <button
              onClick={testDatabase}
              disabled={loading === 'database'}
              className="w-full bg-gradient-to-r from-teal-500 to-lime-500 text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading === 'database' ? 'Testing...' : 'Test Database'}
            </button>
            {results.database && (
              <div className="mt-4 p-4 bg-gray-700 rounded text-sm">
                <pre className="whitespace-pre-wrap text-green-400">
                  {JSON.stringify(results.database, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-3">📝 Instructions</h3>
          <ul className="space-y-2 text-gray-300">
            <li>
              <strong>Email Test:</strong> <span className="text-yellow-400">Optional - Can be set up later</span>. Requires SMTP configuration in .env.local:
              <code className="block mt-1 p-2 bg-gray-800 rounded text-xs">
                SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
              </code>
            </li>
            <li>
              <strong>Database Test:</strong> Requires Supabase configuration:
              <code className="block mt-1 p-2 bg-gray-800 rounded text-xs">
                NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
              </code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
