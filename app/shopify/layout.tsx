/**
 * Shopify embedded app layout.
 *
 * Loaded when the app runs inside the Shopify admin iframe.
 * Intentionally has NO Navigation or Footer — the Shopify admin chrome
 * provides the surrounding UI. App Bridge is initialised here so all
 * child pages can call useAppBridge().
 */

import { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppBridgeProvider } from '@/contexts/AppBridgeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from 'next-themes';

export const metadata = {
  robots: { index: false, follow: false }, // don't index embedded routes
};

export default function ShopifyEmbeddedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <ErrorBoundary>
        <AuthProvider>
          <Suspense>
            <AppBridgeProvider>
              <main>{children}</main>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1a1a1a',
                    color: '#ededed',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  },
                }}
              />
            </AppBridgeProvider>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
