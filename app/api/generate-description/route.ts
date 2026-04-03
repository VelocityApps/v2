import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const TONE_INSTRUCTIONS: Record<string, string> = {
  casual:
    'Write in a friendly, conversational tone. Use simple language, contractions, and a warm, approachable voice that feels like a recommendation from a friend.',
  premium:
    'Write in an elevated, sophisticated tone. Use refined language that conveys quality, craftsmanship, and exclusivity. Every word should feel considered.',
  technical:
    'Write in a precise, informative tone. Lead with specifications, materials, and technical advantages. Use accurate industry terminology and appeal to informed buyers.',
  playful:
    'Write in a fun, energetic tone. Use wordplay, enthusiasm, and a personality that resonates with a younger, trend-aware audience. Keep it punchy.',
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'British English', fr: 'French', de: 'German', es: 'Spanish', it: 'Italian',
  nl: 'Dutch', pt: 'Portuguese', pl: 'Polish', sv: 'Swedish', da: 'Danish',
  no: 'Norwegian', fi: 'Finnish', ja: 'Japanese', zh: 'Simplified Chinese', ko: 'Korean',
};

/**
 * POST /api/generate-description
 * Generates an AI product description using Claude.
 * Requires has_description_writer = true on the user's profile.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Gate on subscription
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('has_description_writer')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.has_description_writer) {
    return NextResponse.json({ error: 'AI Description Writer subscription required' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { productTitle, bulletPoints, tone, language = 'en', customPrompt, productId } = body;

  if (!productTitle || typeof productTitle !== 'string' || !productTitle.trim()) {
    return NextResponse.json({ error: 'productTitle is required' }, { status: 400 });
  }
  if (!Array.isArray(bulletPoints) || bulletPoints.length === 0) {
    return NextResponse.json({ error: 'bulletPoints must be a non-empty array' }, { status: 400 });
  }
  if (!tone || !TONE_INSTRUCTIONS[tone]) {
    return NextResponse.json({ error: 'tone must be one of: casual, premium, technical, playful' }, { status: 400 });
  }

  // Fetch brand voice instructions if configured
  const { data: settings } = await supabaseAdmin
    .from('description_writer_settings')
    .select('brand_voice_instructions')
    .eq('user_id', user.id)
    .maybeSingle();

  const brandVoice = settings?.brand_voice_instructions ?? null;
  const langName = LANGUAGE_NAMES[language] ?? language;

  const systemPrompt = buildSystemPrompt(tone, langName, brandVoice);
  const userMessage = buildUserMessage(productTitle.trim(), bulletPoints, customPrompt);

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
    console.error('[generate-description] Claude error:', err);
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 });
  }

  // Persist the generation
  const { data: generation, error: genError } = await supabaseAdmin
    .from('description_generations')
    .insert({
      user_id: user.id,
      product_id: productId ?? null,
      input_data: { productTitle, bulletPoints, tone, language, customPrompt: customPrompt ?? null },
      output,
      tone,
      language,
    })
    .select('id')
    .single();

  if (genError) {
    console.error('[generate-description] Failed to save generation:', genError.message);
  }

  // Also snapshot to history for version revert
  if (generation?.id) {
    await supabaseAdmin
      .from('description_history')
      .insert({ generation_id: generation.id, output });

    // Prune history for this product beyond 5 entries
    if (productId) {
      const { data: oldGenerations } = await supabaseAdmin
        .from('description_generations')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .range(5, 999);

      if (oldGenerations?.length) {
        const oldIds = oldGenerations.map((g: any) => g.id);
        await supabaseAdmin.from('description_generations').delete().in('id', oldIds);
      }
    }
  }

  return NextResponse.json({ output, generationId: generation?.id ?? null });
}

function buildSystemPrompt(tone: string, languageName: string, brandVoice?: string | null): string {
  const toneInstruction = TONE_INSTRUCTIONS[tone];
  const langInstruction =
    languageName === 'British English'
      ? 'Write in British English.'
      : `Write entirely in ${languageName}. Do not mix languages.`;

  return `You are an expert Shopify product copywriter specialising in conversion-optimised, SEO-friendly product descriptions.

## Tone
${toneInstruction}

## Language
${langInstruction}

## Format requirements
- Output clean, semantic HTML ready to paste directly into the Shopify product editor
- Use <p> for paragraphs and <ul>/<li> for bullet points — no other tags
- Structure: one compelling intro paragraph → 3-5 benefit-led bullet points → one persuasive closing CTA paragraph
- The intro must hook the reader with the primary benefit or transformation, not a generic statement
- Each bullet should lead with a concrete benefit, not a feature list
- The CTA paragraph should create mild urgency and direct the reader to buy

## Quality rules
- Be specific and vivid — avoid generic filler: "high quality", "best in class", "look no further", "perfect for", "great for"
- Every sentence must earn its place — no padding
- Include the product title naturally for SEO, but do not keyword-stuff
- Never start with "Introducing..." or "Are you looking for..."${brandVoice ? `\n\n## Brand voice guidelines\n${brandVoice}` : ''}`;
}

function buildUserMessage(productTitle: string, bulletPoints: string[], customPrompt?: string): string {
  const filteredBullets = bulletPoints.filter((b) => typeof b === 'string' && b.trim());
  const bulletList = filteredBullets.map((b) => `- ${b.trim()}`).join('\n');

  let msg = `Product title: ${productTitle}\n\nKey points to highlight:\n${bulletList}`;
  if (customPrompt?.trim()) {
    msg += `\n\nAdditional instructions: ${customPrompt.trim()}`;
  }
  return msg;
}
