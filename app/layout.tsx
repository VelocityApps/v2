import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'VelocityApps – Shopify Automation Marketplace',
    template: '%s | VelocityApps',
  },
  description:
    'Browse 20+ pre-built automations for your Shopify store. Abandoned cart recovery, review requests, low stock alerts, best-sellers collection sync, and more — all with zero code.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: 'VelocityApps',
    title: 'VelocityApps – Shopify Automation Marketplace',
    description:
      'Browse 20+ pre-built automations for your Shopify store. Zero code required.',
    // og:image is auto-generated from app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VelocityApps – Shopify Automation Marketplace',
    description:
      'Browse 20+ pre-built automations for your Shopify store. Zero code required.',
    // twitter:image falls back to og:image from opengraph-image.tsx
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Navigation />
              <main className="flex-grow">
                {children}
              </main>
              <Footer />
            </div>
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
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#1a1a1a',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#1a1a1a',
                  },
                },
              }}
            />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
