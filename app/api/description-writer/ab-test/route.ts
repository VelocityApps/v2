import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { getEmailFrom } from '@/lib/email/send';

const anthropic = new Anthropic();

/**
 * POST /api/description-writer/ab-test
 * Generates two description variants and creates an A/B test record.
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

  const { productTitle, bulletPoints, tone = 'premium', language = 'en', productId, visitThreshold = 200 } = body;
  if (!productTitle || !bulletPoints?.length || !productId) {
    return NextResponse.json({ error: 'productTitle, bulletPoints, and productId are required' }, { status: 400 });
  }

  const bullets = (bulletPoints as string[]).filter((b) => b.trim()).map((b) => `- ${b}`).join('\n');

  const TONE_MAP: Record<string, string> = {
    casual: 'friendly, conversational tone with contractions',
    premium: 'elevated, sophisticated tone conveying quality',
    technical: 'precise, spec-driven tone with accurate terminology',
    playful: 'energetic, fun tone with personality',
  };
  const toneDesc = TONE_MAP[tone] ?? TONE_MAP.premium;

  const systemA = `You are a Shopify copywriter. Write a conversion-optimised product description in clean HTML (<p> and <ul>/<li>).
Tone: ${toneDesc}. Language: ${language === 'en' ? 'British English' : language}.
Variant A: Lead with the EMOTIONAL benefit — how the product makes the customer feel. Use storytelling in the intro.`;

  const systemB = `You are a Shopify copywriter. Write a conversion-optimised product description in clean HTML (<p> and <ul>/<li>).
Tone: ${toneDesc}. Language: ${language === 'en' ? 'British English' : language}.
Variant B: Lead with the RATIONAL benefit — what problem the product solves. Use direct, evidence-based language in the intro.`;

  const userMessage = `Product: ${productTitle}\n\nKey points:\n${bullets}`;

  const [msgA, msgB] = await Promise.all([
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      system: systemA, messages: [{ role: 'user', content: userMessage }],
    }),
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      system: systemB, messages: [{ role: 'user', content: userMessage }],
    }),
  ]);

  const variantA = (msgA.content[0] as Anthropic.TextBlock).text;
  const variantB = (msgB.content[0] as Anthropic.TextBlock).text;

  const { data: test, error } = await supabaseAdmin
    .from('ab_tests')
    .insert({
      user_id: user.id,
      product_id: String(productId),
      variant_a: variantA,
      variant_b: variantB,
      status: 'running',
      visit_threshold: visitThreshold,
      current_variant: 'a',
    })
    .select()
    .single();

  if (error) {
    console.error('[ab-test] Failed to save:', error.message);
    return NextResponse.json({ error: 'Failed to create A/B test' }, { status: 500 });
  }

  return NextResponse.json({ test, variantA, variantB });
}

/**
 * GET /api/description-writer/ab-test?product_id=x (or list all)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('product_id');

  const query = supabaseAdmin
    .from('ab_tests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (productId) query.eq('product_id', productId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });

  return NextResponse.json({ tests: data ?? [] });
}

/**
 * PATCH /api/description-writer/ab-test
 * Records a view event for a variant, auto-declares winner when threshold is reached.
 */
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { testId, variant } = body; // variant: 'a' | 'b'
  if (!testId || !['a', 'b'].includes(variant)) {
    return NextResponse.json({ error: 'testId and variant (a|b) required' }, { status: 400 });
  }

  const { data: test } = await supabaseAdmin
    .from('ab_tests')
    .select('*')
    .eq('id', testId)
    .eq('user_id', user.id)
    .single();

  if (!test || test.status !== 'running') {
    return NextResponse.json({ error: 'Test not found or already complete' }, { status: 404 });
  }

  const update: any = {
    variant_a_views: test.variant_a_views + (variant === 'a' ? 1 : 0),
    variant_b_views: test.variant_b_views + (variant === 'b' ? 1 : 0),
    // Rotate variant for next visitor
    current_variant: test.current_variant === 'a' ? 'b' : 'a',
  };

  const totalViews = update.variant_a_views + update.variant_b_views;

  // Auto-declare winner when threshold reached
  if (totalViews >= test.visit_threshold) {
    const winner = update.variant_a_views >= update.variant_b_views ? 'a' : 'b';
    update.winner = winner;
    update.status = 'complete';
    update.completed_at = new Date().toISOString();
  }

  const { data: updated } = await supabaseAdmin
    .from('ab_tests')
    .update(update)
    .eq('id', testId)
    .select()
    .single();

  // Send winner notification email when test completes
  if (update.status === 'complete' && updated) {
    void sendWinnerEmail(user.id, updated);
  }

  return NextResponse.json({ test: updated });
}

// ── Email helper ──────────────────────────────────────────────────────────────

async function sendWinnerEmail(userId: string, test: any): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
    if (!apiKey) return;

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';
    const winnerLabel = test.winner === 'a' ? 'Variant A (Emotional)' : 'Variant B (Rational)';
    const winnerViews = test.winner === 'a' ? test.variant_a_views : test.variant_b_views;
    const loserViews = test.winner === 'a' ? test.variant_b_views : test.variant_a_views;

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: getEmailFrom(),
      to: email,
      subject: `A/B Test Complete — ${winnerLabel} won!`,
      html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
  <h2 style="margin:0 0 8px">Your A/B test has a winner 🏆</h2>
  <p style="color:#666;margin:0 0 24px">Product ID: ${test.product_id}</p>

  <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin-bottom:20px">
    <p style="margin:0 0 4px;font-weight:600;font-size:18px">Winner: ${winnerLabel}</p>
    <p style="margin:0;color:#666">${winnerViews} views vs ${loserViews} views</p>
  </div>

  <p style="color:#666">The winning description has been applied permanently to your product.</p>

  <a href="${appUrl}/dashboard/description-writer/ab-testing" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
    View All Tests
  </a>
</div>`,
    });
  } catch (err: any) {
    console.error('[ab-test] Winner email failed:', err.message);
  }
}
