import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase-server';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/marketplace`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Dynamic automation detail pages
  try {
    const { data: automations } = await supabaseAdmin
      .from('automations')
      .select('slug, updated_at')
      .eq('active', true);

    const automationRoutes: MetadataRoute.Sitemap = (automations || []).map((a) => ({
      url: `${BASE_URL}/automations/${a.slug}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...automationRoutes];
  } catch {
    // If DB is unavailable at build time, return static routes only
    return staticRoutes;
  }
}
