import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';

/**
 * GET /api/description-writer/health-score?offset=0&limit=50
 * Scans products and scores their descriptions across multiple dimensions.
 * Results are cached in description_health_scores.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('has_description_writer')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.has_description_writer) {
    return NextResponse.json({ error: 'AI Description Writer subscription required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 50);
  const refresh = searchParams.get('refresh') === 'true';

  const { data: ua } = await supabaseAdmin
    .from('user_automations')
    .select('shopify_store_url, shopify_access_token_encrypted')
    .eq('user_id', user.id)
    .in('status', ['active', 'trial'])
    .not('shopify_access_token_encrypted', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ua) return NextResponse.json({ error: 'No connected Shopify store found' }, { status: 400 });

  const accessToken = await decryptToken(ua.shopify_access_token_encrypted);
  const shopify = new ShopifyClient(ua.shopify_store_url, accessToken);

  // Fetch products page
  const products = await shopify.getProducts(250);
  const page = products.slice(offset, offset + limit);

  const scores = await Promise.all(
    page.map(async (product: any) => {
      // Check cache
      if (!refresh) {
        const { data: cached } = await supabaseAdmin
          .from('description_health_scores')
          .select('*')
          .eq('user_id', user.id)
          .eq('product_id', String(product.id))
          .maybeSingle();
        if (cached) return cached;
      }

      const html: string = product.body_html ?? '';
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const words = text.split(/\s+/).filter(Boolean);
      const wordCount = words.length;

      // ── Scoring ──────────────────────────────────────────────────────────
      // Length score: ideal 150-300 words
      const lengthScore = wordCount === 0 ? 0
        : wordCount < 50 ? 20
        : wordCount < 100 ? 40
        : wordCount < 150 ? 60
        : wordCount <= 300 ? 100
        : wordCount <= 400 ? 80
        : 60;

      // SEO score: product title keyword present, description not empty
      const titleWords = product.title.toLowerCase().split(/\s+/);
      const descLower = text.toLowerCase();
      const keywordHits = titleWords.filter((w: string) => w.length > 3 && descLower.includes(w)).length;
      const seoScore = wordCount === 0 ? 0
        : Math.min(100, Math.round((keywordHits / Math.max(titleWords.length, 1)) * 100));

      // Readability: simple Flesch proxy (avg sentence + word length)
      const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 5);
      const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : wordCount;
      const avgWordLength = wordCount > 0 ? text.replace(/\s/g, '').length / wordCount : 0;
      const fleschProxy = Math.max(0, Math.min(100,
        Math.round(206.835 - 1.015 * avgWordsPerSentence - 84.6 * (avgWordLength / 5))
      ));
      const readabilityScore = wordCount === 0 ? 0 : fleschProxy;

      // CTA score: presence of action words
      const ctaWords = ['buy', 'shop', 'order', 'get', 'grab', 'try', 'add to cart', 'discover', 'explore'];
      const ctaScore = ctaWords.some((w) => descLower.includes(w)) ? 100 : 0;

      // Benefit score: "you" language ratio
      const youWords = ['you', 'your', 'yours'];
      const youCount = words.filter((w: string) => youWords.includes(w.toLowerCase())).length;
      const benefitScore = wordCount === 0 ? 0 : Math.min(100, Math.round((youCount / wordCount) * 1000));

      const overall = Math.round(
        (lengthScore * 0.25 + seoScore * 0.25 + readabilityScore * 0.2 + ctaScore * 0.15 + benefitScore * 0.15)
      );

      const scoreRow = {
        user_id: user.id,
        product_id: String(product.id),
        product_title: product.title,
        overall_score: overall,
        readability_score: readabilityScore,
        length_score: lengthScore,
        seo_score: seoScore,
        cta_score: ctaScore,
        benefit_score: benefitScore,
        word_count: wordCount,
        scanned_at: new Date().toISOString(),
      };

      await supabaseAdmin
        .from('description_health_scores')
        .upsert(scoreRow, { onConflict: 'user_id,product_id' });

      return scoreRow;
    })
  );

  // Sort worst first
  scores.sort((a: any, b: any) => a.overall_score - b.overall_score);

  return NextResponse.json({
    scores,
    total: products.length,
    offset,
    limit,
    hasMore: offset + limit < products.length,
  });
}
