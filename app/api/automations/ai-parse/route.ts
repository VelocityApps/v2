import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const ConditionSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.string(),
});

const TriggerSchema = z.object({
  type: z.enum(['order/paid', 'order/fulfilled', 'customer/create', 'refund/create']),
  conditions: z.array(ConditionSchema).default([]),
});

const ActionSchema = z.object({
  type: z.enum(['tag_customer', 'send_discount', 'add_order_note', 'send_email']),
  params: z.record(z.string(), z.unknown()),
});

const ParsedAutomationSchema = z.object({
  trigger: TriggerSchema,
  action: ActionSchema,
  humanReadable: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

const UnsupportedSchema = z.object({
  error: z.literal('unsupported'),
  message: z.string(),
});

const ClaudeResponseSchema = z.union([ParsedAutomationSchema, UnsupportedSchema]);

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an automation config parser for a Shopify automation platform.
A merchant will describe what they want to automate in plain English.
You must return ONLY valid JSON — no markdown, no explanation.

Supported triggers: order/paid, order/fulfilled, customer/create, refund/create
Supported actions: tag_customer, send_discount, add_order_note, send_email

Return this exact schema:
{
  "trigger": {
    "type": "order/paid",
    "conditions": [{ "field": "total_price", "operator": "greater_than", "value": "50" }]
  },
  "action": {
    "type": "tag_customer",
    "params": { "tag": "vip" }
  },
  "humanReadable": "When an order is paid over £50 → Tag the customer as VIP",
  "confidence": 0.95,
  "reasoning": "Merchant wants to identify high-value customers after purchase"
}

If the request cannot be mapped to a supported trigger/action, return:
{ "error": "unsupported", "message": "Brief explanation of what isn't supported yet" }`;

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse body
  let prompt: string;
  let shopDomain: string;
  try {
    const body = await request.json();
    prompt = String(body.prompt ?? '').trim();
    shopDomain = String(body.shopDomain ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!prompt || prompt.length < 5) {
    return NextResponse.json({ error: 'Prompt is too short' }, { status: 400 });
  }
  if (prompt.length > 2000) {
    return NextResponse.json({ error: 'Prompt exceeds 2000 characters' }, { status: 400 });
  }
  if (!shopDomain) {
    return NextResponse.json({ error: 'shopDomain is required' }, { status: 400 });
  }

  // Call Claude
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });

  const anthropic = new Anthropic({ apiKey });

  let rawContent: string;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0];
    if (block.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    rawContent = block.text.trim();
  } catch (err: any) {
    console.error('[ai-parse] Claude API error:', err?.message);
    return NextResponse.json({ error: 'AI service error. Please try again.' }, { status: 502 });
  }

  // Parse and validate JSON
  let parsed: unknown;
  try {
    // Strip accidental markdown code fences if Claude includes them despite instructions
    const cleaned = rawContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('[ai-parse] JSON parse failed. Raw:', rawContent);
    return NextResponse.json({ error: 'AI returned malformed JSON. Please rephrase and try again.' }, { status: 422 });
  }

  const validation = ClaudeResponseSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('[ai-parse] Zod validation failed:', validation.error.issues);
    return NextResponse.json({ error: 'AI response did not match expected schema. Please rephrase and try again.' }, { status: 422 });
  }

  const result = validation.data;

  // Unsupported request — save draft with error status and return to client
  if ('error' in result) {
    const { data: draft } = await supabaseAdmin
      .from('ai_automation_drafts')
      .insert({
        user_id: user.id,
        shop_domain: shopDomain,
        raw_prompt: prompt,
        status: 'error',
        claude_reasoning: result.message,
      })
      .select('id')
      .single();

    return NextResponse.json({
      unsupported: true,
      message: result.message,
      draftId: draft?.id ?? null,
    });
  }

  // Save draft
  const { data: draft, error: insertError } = await supabaseAdmin
    .from('ai_automation_drafts')
    .insert({
      user_id: user.id,
      shop_domain: shopDomain,
      raw_prompt: prompt,
      parsed_trigger: result.trigger,
      parsed_action: result.action,
      status: 'draft',
      claude_reasoning: result.reasoning,
    })
    .select('id')
    .single();

  if (insertError || !draft) {
    console.error('[ai-parse] DB insert error:', insertError);
    return NextResponse.json({ error: 'Failed to save automation draft' }, { status: 500 });
  }

  return NextResponse.json({
    draftId: draft.id,
    trigger: result.trigger,
    action: result.action,
    humanReadable: result.humanReadable,
    confidence: result.confidence,
    lowConfidence: result.confidence < 0.7,
  });
}
