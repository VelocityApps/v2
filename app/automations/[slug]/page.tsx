import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const revalidate = 60;

const APP_URL = 'https://velocityapps.dev';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: automation } = await supabaseAdmin
    .from('automations')
    .select('name, description, price_monthly, category')
    .eq('slug', slug)
    .eq('active', true)
    .single();

  if (!automation) return {};

  const title = `${automation.name} for Shopify`;
  const description = `${automation.description} Start with a 7-day free trial. No code required.`;
  const url = `${APP_URL}/automations/${slug}`;

  return {
    title,
    description,
    openGraph: { title: `${title} – VelocityApps`, description, url },
    twitter: { title: `${title} – VelocityApps`, description },
    alternates: { canonical: url },
  };
}

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: automation, error } = await supabaseAdmin
    .from('automations')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single();

  if (error || !automation) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: automation.name,
    description: automation.long_description || automation.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Shopify',
    url: `${APP_URL}/automations/${slug}`,
    offers: {
      '@type': 'Offer',
      price: automation.price_monthly,
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: automation.price_monthly,
        priceCurrency: 'USD',
        unitCode: 'MON',
      },
    },
    provider: {
      '@type': 'Organization',
      name: 'VelocityApps',
      url: APP_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/marketplace"
          className="text-[#0066cc] hover:text-[#0052a3] mb-6 inline-block"
        >
          ← Back to Marketplace
        </Link>

        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8 mb-8">
          <div className="flex items-start gap-6 mb-6">
            <div className="text-5xl">{automation.icon}</div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{automation.name}</h1>
              <p className="text-gray-400 mb-4">{automation.description}</p>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-[#333] rounded-full text-sm">
                  {automation.category}
                </span>
                <span className="text-gray-400 text-sm">
                  {automation.user_count || 0} stores using this
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">About</h2>
            <p className="text-gray-300 leading-relaxed">
              {automation.long_description || automation.description}
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Features</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(automation.features || []).map((feature: string, index: number) => (
                <li key={index} className="flex items-center gap-2 text-gray-300">
                  <span className="text-green-400">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[#333] pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold mb-1">
                  ${automation.price_monthly}/month
                </div>
                <p className="text-gray-400 text-sm">Per automation</p>
              </div>
              <a
                href="/marketplace"
                className="px-6 py-3 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg font-medium transition-colors inline-block"
              >
                Add to Store
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

