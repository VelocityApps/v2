import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/**
 * POST /api/generate-description/competitor
 * Generates a description that positions against a competitor's product.
 * Scrapes the competitor URL server-side then passes it to Claude.
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

  const { productTitle, bulletPoints, tone = 'premium', language = 'en', customPrompt, productId, competitorUrl } = body;

  if (!productTitle || !bulletPoints?.length || !competitorUrl) {
    return NextResponse.json({ error: 'productTitle, bulletPoints, and competitorUrl are required' }, { status: 400 });
  }

  // Validate URL — must be http/https
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(competitorUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Bad protocol');
  } catch {
    return NextResponse.json({ error: 'Invalid competitor URL' }, { status: 400 });
  }

  // Fetch competitor page and extract text
  let competitorText = '';
  try {
    const res = await fetch(parsedUrl.href, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VelocityApps/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    // Strip tags and collapse whitespace
    competitorText = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 3000); // Keep it under Claude's context
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to fetch competitor URL: ${err.message}` }, { status: 422 });
  }

  const { data: settings } = await supabaseAdmin
    .from('description_writer_settings')
    .select('brand_voice_instructions')
    .eq('user_id', user.id)
    .maybeSingle();

  const brandVoice = settings?.brand_voice_instructions ?? null;
  const bullets = (bulletPoints as string[]).filter((b) => b.trim()).map((b) => `- ${b}`).join('\n');

  const systemPrompt = `You are an expert Shopify product copywriter specialising in competitive positioning.

Write a compelling, SEO-optimised product description in clean HTML (<p> and <ul>/<li> only).
Structure: benefit-led intro paragraph → 3-5 bullet points → strong closing CTA.

The merchant has a competitor's page. Study it and write a description for OUR product that:
- Highlights where our product is clearly superior or different
- Uses stronger, more specific benefit language than the competitor
- Makes the competitor's description feel generic by comparison
- Never mentions the competitor by name — just implicitly outperforms them

Tone: ${tone}. Language: ${language === 'en' ? 'British English' : language}.${brandVoice ? `\n\nBrand voice: ${brandVoice}` : ''}`;

  const userMessage = `Our product: ${productTitle}

Our key points:\n${bullets}

Competitor's page content (for positioning reference):\n${competitorText}${customPrompt ? `\n\nAdditional instructions: ${customPrompt}` : ''}`;

  let output: string;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    output = (message.content[0] as Anthropic.TextBlock).text;
  } catch (err: any) {
    console.error('[generate-description/competitor] Claude error:', err);
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 });
  }

  // Save generation with mode flag
  const { data: generation } = await supabaseAdmin
    .from('description_generations')
    .insert({
      user_id: user.id,
      product_id: productId ?? null,
      input_data: { productTitle, bulletPoints, tone, language, competitorUrl, mode: 'competitor' },
      output,
      tone,
      language,
    })
    .select('id')
    .single();

  if (generation?.id) {
    await supabaseAdmin.from('description_history').insert({ generation_id: generation.id, output });
  }

  return NextResponse.json({ output, competitorText, generationId: generation?.id ?? null });
}
