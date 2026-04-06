import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Automation Marketplace',
  description:
    'Browse 20+ pre-built Shopify automations — abandoned cart recovery, review requests, low stock alerts, best-sellers sync, and more. 7-day free trial, no code required.',
  openGraph: {
    title: 'Automation Marketplace – VelocityApps',
    description:
      'Browse 20+ pre-built Shopify automations. 7-day free trial, no code required.',
    url: 'https://velocityapps.dev/marketplace',
  },
  twitter: {
    title: 'Automation Marketplace – VelocityApps',
    description:
      'Browse 20+ pre-built Shopify automations. 7-day free trial, no code required.',
  },
  alternates: {
    canonical: 'https://velocityapps.dev/marketplace',
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
