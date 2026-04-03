import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/**
 * POST /api/description-writer/health-score/fix
 * Generates a new description for a product and pushes it live to Shopify.
 * Used by the health scorer "Fix with AI" button.
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

  const { productId, productTitle } = body;
  if (!productId || !productTitle) {
    return NextResponse.json({ error: 'productId and productTitle are required' }, { status: 400 });
  }

  // Get user's Shopify store
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

  // Load brand voice and default settings
  const [settingsRes, brandVoiceRes] = await Promise.all([
    supabaseAdmin.from('description_writer_settings').select('default_tone, default_language, brand_voice_instructions').eq('user_id', user.id).maybeSingle(),
    supabaseAdmin.from('brand_voice_profiles').select('phrases_to_use, phrases_to_avoid, tone, personality_traits').eq('user_id', user.id).maybeSingle(),
  ]);

  const tone = settingsRes.data?.default_tone ?? 'premium';
  const language = settingsRes.data?.default_language ?? 'en';
  const brandVoice = settingsRes.data?.brand_voice_instructions ?? null;

  // Fetch live product for its tags (used as bullet points if no description)
  const accessToken = await decryptToken(ua.shopify_access_token_encrypted);
  const shopify = new ShopifyClient(ua.shopify_store_url, accessToken);

  let bulletPoints = ['See product details for full specifications'];
  try {
    const product = await shopify.getProduct(productId);
    const tags = (product.tags as any as string ?? '').split(',').map((t: string) => t.trim()).filter(Boolean);
    if (tags.length > 0) bulletPoints = tags.slice(0, 5);
  } catch {
    // Non-fatal — use default bullet
  }

  // Build brand voice hint
  const bvProfile = brandVoiceRes.data;
  let brandHint = brandVoice ?? '';
  if (bvProfile && !brandHint) {
    brandHint = [
      bvProfile.tone?.length ? `Tone: ${bvProfile.tone.join(', ')}.` : '',
      bvProfile.personality_traits?.length ? `Personality: ${bvProfile.personality_traits.join(', ')}.` : '',
      bvProfile.phrases_to_use?.length ? `Phrases to use: ${bvProfile.phrases_to_use.join(', ')}.` : '',
      bvProfile.phrases_to_avoid?.length ? `Avoid: ${bvProfile.phrases_to_avoid.join(', ')}.` : '',
    ].filter(Boolean).join(' ');
  }

  const TONE_INSTRUCTIONS: Record<string, string> = {
    casual: 'friendly, conversational, warm',
    premium: 'elevated, sophisticated, refined',
    technical: 'precise, spec-driven, expert',
    playful: 'energetic, fun, personality-led',
  };

  const systemPrompt = `You are an expert Shopify product copywriter.
Tone: ${TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.premium}. Language: ${language === 'en' ? 'British English' : language}.
Output clean HTML: one benefit-led <p> intro, 3-5 <ul>/<li> bullets, one CTA <p>. No generic filler.${brandHint ? `\n\nBrand voice: ${brandHint}` : ''}`;

  let output: string;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Product: ${productTitle}\n\nKey points:\n${bulletPoints.map(b => `- ${b}`).join('\n')}` }],
    });
    output = (msg.content[0] as Anthropic.TextBlock).text;
  } catch (err: any) {
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 });
  }

  // Push to Shopify
  try {
    await shopify.updateProduct(productId, { body_html: output } as any);
  } catch (err: any) {
    console.error('[health-score/fix] Failed to push to Shopify:', err.message);
    return NextResponse.json({ error: 'Generated but failed to push to Shopify: ' + err.message }, { status: 500 });
  }

  // Save generation + update health score
  const { data: gen } = await supabaseAdmin
    .from('description_generations')
    .insert({
      user_id: user.id,
      product_id: String(productId),
      input_data: { productTitle, bulletPoints, tone, language, trigger: 'health_score_fix' },
      output,
      tone,
      language,
    })
    .select('id')
    .single();

  if (gen?.id) {
    await supabaseAdmin.from('description_history').insert({ generation_id: gen.id, output });
  }

  // Optimistically bump the health score to avoid stale cache
  const wordCount = output.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  await supabaseAdmin
    .from('description_health_scores')
    .update({ word_count: wordCount, overall_score: 75, scanned_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('product_id', String(productId));

  return NextResponse.json({ output, pushed: true, generationId: gen?.id ?? null });
}
