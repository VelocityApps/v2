import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * POST /api/automations/ai-fill-config
 *
 * Takes a plain-English description of what the merchant wants and a
 * config_schema, returns a filled config object ready to pre-populate the form.
 *
 * Body: { prompt: string, configSchema: object, automationName: string }
 * Returns: { config: Record<string, any> }
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let prompt: string;
  let configSchema: Record<string, any>;
  let automationName: string;

  try {
    const body = await request.json();
    prompt = String(body.prompt ?? '').trim();
    configSchema = body.configSchema ?? {};
    automationName = String(body.automationName ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!prompt || prompt.length < 5) {
    return NextResponse.json({ error: 'Prompt is too short' }, { status: 400 });
  }
  if (prompt.length > 1000) {
    return NextResponse.json({ error: 'Prompt exceeds 1000 characters' }, { status: 400 });
  }
  if (!Object.keys(configSchema).length) {
    return NextResponse.json({ error: 'No config schema provided' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });

  // Build a schema description for the prompt
  const schemaDescription = Object.entries(configSchema)
    .map(([key, field]: [string, any]) => {
      let desc = `  "${key}" (${field.type}): ${field.label}`;
      if (field.description) desc += ` — ${field.description}`;
      if (field.options) desc += `. Options: ${field.options.join(', ')}`;
      if (field.default !== undefined) desc += `. Default: ${JSON.stringify(field.default)}`;
      if (field.required) desc += ` [required]`;
      return desc;
    })
    .join('\n');

  const systemPrompt = `You are a configuration assistant for a Shopify automation platform.
A merchant has described what they want. Your job is to fill in the configuration fields based on their description.
Return ONLY valid JSON — no markdown, no explanation, just the JSON object.

The configuration schema for "${automationName}" is:
${schemaDescription}

Rules:
- Only include fields that are clearly specified or strongly implied by the merchant's description
- Use the exact field keys from the schema
- For select fields, only use values from the listed options
- For number fields, use reasonable numeric values
- For checkbox fields, use true or false
- If a field is not relevant to the description, omit it (the default will be used)
- Never invent values for fields not mentioned`;

  const anthropic = new Anthropic({ apiKey });

  let rawContent: string;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Merchant's description: "${prompt}"` }],
    });
    const block = message.content[0];
    if (block.type !== 'text') throw new Error('Unexpected response type');
    rawContent = block.text.trim();
  } catch (err: any) {
    console.error('[ai-fill-config] Claude error:', err?.message);
    return NextResponse.json({ error: 'AI service error. Please try again.' }, { status: 502 });
  }

  let config: Record<string, any>;
  try {
    const cleaned = rawContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
    config = JSON.parse(cleaned);
    // Validate — only keep keys that exist in the schema
    const validKeys = new Set(Object.keys(configSchema));
    for (const key of Object.keys(config)) {
      if (!validKeys.has(key)) delete config[key];
    }
  } catch {
    console.error('[ai-fill-config] JSON parse failed. Raw:', rawContent);
    return NextResponse.json({ error: 'AI returned malformed JSON. Please rephrase and try again.' }, { status: 422 });
  }

  return NextResponse.json({ config });
}
