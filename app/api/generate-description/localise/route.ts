import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const MARKET_PROFILES: Record<string, string> = {
  GB: 'UK English: formal but warm, dry wit, metric units, £ currency, "whilst/colour/favour" spellings. Avoid Americanisms.',
  US: 'US English: direct, benefit-first, conversational, imperial units, $ currency, "while/color/favor" spellings. Bold claims are fine.',
  AU: 'Australian English: casual, unpretentious, laconic, dry humour, metric units, A$ currency. Avoid sounding corporate.',
  CA: 'Canadian English: polite, inclusive, similar to US but slightly more formal. C$ currency, metric units.',
  DE: 'German: formal tone ("Sie"), precise and thorough, detail-oriented, metric units, € currency.',
  FR: 'French: elegant, slightly formal, emphasise quality and craft, metric units, € currency.',
  ES: 'Spanish (Spain): warm and expressive, "usted" form, metric units, € currency.',
  IT: 'Italian: expressive, emphasise style and quality, metric units, € currency.',
  NL: 'Dutch: direct, practical, no-nonsense, metric units, € currency.',
  JP: 'Japanese: polite, respectful, emphasise quality, harmony, and craftsmanship.',
  SE: 'Swedish: clean, minimal, functional, egalitarian tone, metric units, kr currency.',
};

/**
 * POST /api/generate-description/localise
 * Rewrites a base description for a specific Shopify Market / locale.
 */
export async function POST(request: NextRequest) {
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

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { baseDescription, market, language, productId } = body;
  if (!baseDescription || !market) {
    return NextResponse.json({ error: 'baseDescription and market are required' }, { status: 400 });
  }

  const marketProfile = MARKET_PROFILES[market.toUpperCase()] ??
    `${market} market: adapt spelling, idioms, currency, and tone for a local audience.`;

  const systemPrompt = `You are an expert localisation copywriter specialising in Shopify product descriptions.

Rewrite the provided product description for the ${market} market.

Market guidance: ${marketProfile}

Rules:
- Preserve the same structure (intro, bullets, CTA)
- Adjust spelling, idioms, currency references, measurement units, and cultural references
- Match the register of a native ${market} brand — not a translation
- Output clean HTML only (<p> and <ul>/<li>) — no explanatory text`;

  let output: string;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Base description to localise:\n\n${baseDescription}`,
      }],
    });
    output = (message.content[0] as Anthropic.TextBlock).text;
  } catch (err: any) {
    console.error('[generate-description/localise] Claude error:', err);
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 });
  }

  // Save to market_descriptions
  await supabaseAdmin
    .from('market_descriptions')
    .upsert(
      {
        user_id: user.id,
        product_id: productId ?? null,
        market: market.toUpperCase(),
        language: language ?? market.toLowerCase(),
        description: output,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,product_id,market' }
    );

  return NextResponse.json({ output, market: market.toUpperCase() });
}
