/**
 * Test script for the Natural Language Automation Builder.
 *
 * What it does:
 *   1. Finds your user account and a connected shop domain
 *   2. Calls Claude with a test prompt (same code path as the API route)
 *   3. Validates the response with Zod
 *   4. Saves a draft to ai_automation_drafts
 *   5. Runs the activate step (creates automations + user_automations rows)
 *   6. Prints results and cleans up if --cleanup is passed
 *
 * Usage:
 *   npx tsx scripts/test-ai-builder.ts
 *   npx tsx scripts/test-ai-builder.ts --prompt "tag customers who refund as risky"
 *   npx tsx scripts/test-ai-builder.ts --cleanup
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const args = process.argv.slice(2);
const flagVal = (name: string) => {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
};
const cleanup = args.includes('--cleanup');
const testPrompt = flagVal('--prompt') ?? 'When an order is paid over $100, tag the customer as vip';

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Zod schemas (mirrors ai-parse/route.ts) ──────────────────────────────────

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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== AI Automation Builder — Test Script ===\n');
  console.log(`Prompt: "${testPrompt}"\n`);

  // 1. Find a user with a connected store
  const { data: ua, error: uaErr } = await db
    .from('user_automations')
    .select('user_id, shopify_store_url')
    .not('shopify_access_token_encrypted', 'is', null)
    .limit(1)
    .single();

  if (uaErr || !ua) {
    console.error('No user_automations with a connected store found. Install an automation first.');
    process.exit(1);
  }

  const { user_id: userId, shopify_store_url: shopDomain } = ua;
  console.log(`Using user:  ${userId}`);
  console.log(`Shop domain: ${shopDomain}\n`);

  // 2. Call Claude
  console.log('Calling Claude (claude-sonnet-4-6)...');
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: testPrompt }],
  });

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected content type from Claude');
  const rawContent = block.text.trim();
  console.log('\nClaude raw response:');
  console.log(rawContent);

  // 3. Parse + Zod validate
  const cleaned = rawContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
  const parsed = JSON.parse(cleaned);
  const validation = ClaudeResponseSchema.safeParse(parsed);

  if (!validation.success) {
    console.error('\nZod validation FAILED:');
    console.error(validation.error.issues);
    process.exit(1);
  }

  const result = validation.data;
  console.log('\nZod validation: PASSED');

  if ('error' in result) {
    console.log(`\nClaude says unsupported: ${result.message}`);
    return;
  }

  console.log(`Confidence: ${Math.round(result.confidence * 100)}%${result.confidence < 0.7 ? ' ⚠ LOW' : ''}`);
  console.log(`Human readable: ${result.humanReadable}`);

  // 4. Save draft
  const { data: draft, error: draftErr } = await db
    .from('ai_automation_drafts')
    .insert({
      user_id: userId,
      shop_domain: shopDomain,
      raw_prompt: testPrompt,
      parsed_trigger: result.trigger,
      parsed_action: result.action,
      status: 'draft',
      claude_reasoning: result.reasoning,
    })
    .select('id')
    .single();

  if (draftErr || !draft) {
    console.error('\nFailed to save draft:', draftErr);
    process.exit(1);
  }
  console.log(`\nDraft saved: ai_automation_drafts.id = ${draft.id}`);

  // 5. Activate — create automations + user_automations rows
  const slug = `ai-${draft.id.slice(0, 8)}`;
  const triggerLabel: Record<string, string> = {
    'order/paid': 'Order Paid', 'order/fulfilled': 'Order Fulfilled',
    'customer/create': 'New Customer', 'refund/create': 'Refund Created',
  };
  const actionLabel: Record<string, string> = {
    tag_customer: 'Tag Customer', send_discount: 'Send Discount',
    add_order_note: 'Add Order Note', send_email: 'Send Email',
  };
  const automationName = `${triggerLabel[result.trigger.type]} → ${actionLabel[result.action.type]}`;

  const { data: catalogRow, error: catalogErr } = await db
    .from('automations')
    .insert({
      name: automationName,
      slug,
      description: `Custom automation: ${automationName}`,
      category: 'automation',
      price_monthly: 9.00,
      icon: '✨',
      features: ['AI-generated', 'Custom trigger', 'Custom action'],
      config_schema: { trigger: result.trigger, action: result.action, ai_generated: true },
      active: false,
    })
    .select('id')
    .single();

  if (catalogErr || !catalogRow) {
    console.error('\nFailed to create automations row:', catalogErr);
    process.exit(1);
  }
  console.log(`Catalog row created: automations.id = ${catalogRow.id}  slug = ${slug}`);

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: existingUa } = await db
    .from('user_automations')
    .select('shopify_access_token_encrypted')
    .eq('user_id', userId)
    .not('shopify_access_token_encrypted', 'is', null)
    .limit(1)
    .maybeSingle();

  const { data: userAutomation, error: uaInsertErr } = await db
    .from('user_automations')
    .insert({
      user_id: userId,
      automation_id: catalogRow.id,
      shopify_store_url: shopDomain,
      shopify_access_token_encrypted: existingUa?.shopify_access_token_encrypted ?? null,
      config: { trigger: result.trigger, action: result.action },
      status: 'trial',
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select('id')
    .single();

  if (uaInsertErr || !userAutomation) {
    console.error('\nFailed to create user_automations row:', uaInsertErr);
    process.exit(1);
  }
  console.log(`user_automations row created: id = ${userAutomation.id}  status = trial`);

  // Mark draft active
  await db.from('ai_automation_drafts').update({ status: 'active' }).eq('id', draft.id);
  console.log(`Draft marked active`);

  console.log('\n✓ All steps passed\n');
  console.log('Summary:');
  console.log(`  ai_automation_drafts.id  = ${draft.id}`);
  console.log(`  automations.id           = ${catalogRow.id}`);
  console.log(`  user_automations.id      = ${userAutomation.id}`);
  console.log(`  Trial ends               = ${trialEndsAt.toLocaleDateString('en-GB')}`);

  // 6. Cleanup
  if (cleanup) {
    console.log('\nCleaning up test rows...');
    await db.from('user_automations').delete().eq('id', userAutomation.id);
    await db.from('automations').delete().eq('id', catalogRow.id);
    await db.from('ai_automation_drafts').delete().eq('id', draft.id);
    console.log('Done — all test rows removed.');
  } else {
    console.log('\nPass --cleanup to remove test rows.');
    console.log('Or check them in Supabase to verify the schema looks correct.');
  }
}

main().catch((err) => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
