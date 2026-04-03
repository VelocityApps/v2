import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Common review app metafield namespaces
const REVIEW_NAMESPACES = ['reviews', 'stamped', 'yotpo', 'judgeme', 'okendo', 'loox', 'spr'];

/**
 * GET /api/shopify/reviews?product_id={id}
 * Fetches product reviews, extracts voice-of-customer phrases, caches in DB.
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
  const productId = searchParams.get('product_id');
  if (!productId) return NextResponse.json({ error: 'product_id is required' }, { status: 400 });

  // Serve cache if fresh (< 24h)
  const { data: cached } = await supabaseAdmin
    .from('product_review_insights')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.last_fetched_at).getTime();
    if (age < 86_400_000) {
      return NextResponse.json({ insights: cached.extracted_phrases, cached: true });
    }
  }

  // Get store credentials
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

  // Try to fetch review text from known metafield namespaces
  let reviewTexts: string[] = [];

  for (const ns of REVIEW_NAMESPACES) {
    try {
      const resp = await (shopify as any).request<{ metafields: any[] }>(
        `/products/${productId}/metafields.json?namespace=${ns}&limit=250`
      );
      const metafields: any[] = resp.metafields ?? [];

      for (const mf of metafields) {
        // Review body text — different apps use different keys
        if (['body', 'review_body', 'content', 'reviews', 'review'].includes(mf.key)) {
          try {
            // Value may be JSON array of review objects or plain text
            const val = typeof mf.value === 'string' ? mf.value : JSON.stringify(mf.value);
            if (val.startsWith('[')) {
              const arr = JSON.parse(val);
              for (const r of arr) {
                const text = r.body ?? r.content ?? r.review ?? r.text ?? '';
                if (text.trim().length > 20) reviewTexts.push(text.trim());
              }
            } else if (val.length > 20) {
              reviewTexts.push(val.trim());
            }
          } catch {
            // Parse failure — skip this metafield
          }
        }
      }

      if (reviewTexts.length > 0) break; // Found reviews, stop searching
    } catch {
      // Namespace not found / API error — try next
    }
  }

  // Fallback: try the Shopify Product Reviews REST endpoint (only available with the app)
  if (reviewTexts.length === 0) {
    try {
      const resp = await (shopify as any).request<{ product_reviews: any[] }>(
        `/products/${productId}/product_reviews.json?limit=50`
      );
      for (const r of resp.product_reviews ?? []) {
        if (r.body?.trim().length > 20) reviewTexts.push(r.body.trim());
      }
    } catch {
      // Product Reviews app not installed
    }
  }

  if (reviewTexts.length === 0) {
    return NextResponse.json({
      insights: null,
      message: 'No reviews found. Make sure a reviews app (Yotpo, Judge.me, Stamped, etc.) is installed and has reviews for this product.',
    });
  }

  // Extract voice-of-customer insights with Claude
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Analyse these customer reviews and extract voice-of-customer insights.

Reviews:
${reviewTexts.slice(0, 40).join('\n---\n')}

Return a JSON object with exactly these keys:
{
  "positive_phrases": [],   // up to 15 exact phrases customers use to praise the product
  "features_mentioned": [], // up to 10 product features most frequently mentioned
  "concerns": [],           // up to 8 recurring concerns or objections
  "emotional_words": []     // up to 10 emotional/feeling words customers use
}

Return only valid JSON. No markdown.`,
    }],
  });

  let insights: any;
  try {
    insights = JSON.parse((message.content[0] as Anthropic.TextBlock).text);
  } catch {
    insights = { positive_phrases: [], features_mentioned: [], concerns: [], emotional_words: [] };
  }

  // Cache result
  await supabaseAdmin
    .from('product_review_insights')
    .upsert(
      { user_id: user.id, product_id: productId, extracted_phrases: insights, last_fetched_at: new Date().toISOString() },
      { onConflict: 'user_id,product_id' }
    );

  return NextResponse.json({ insights, cached: false, reviewCount: reviewTexts.length });
}
