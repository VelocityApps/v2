import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/**
 * GET /api/description-writer/seasonal
 * Returns all seasonal schedules for the user.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('seasonal_schedules')
    .select('*')
    .eq('user_id', user.id)
    .order('event_date', { ascending: true });

  return NextResponse.json({ schedules: data ?? [] });
}

/**
 * POST /api/description-writer/seasonal
 * Creates a seasonal refresh schedule.
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

  const { collectionId, eventName, eventDate, daysBeforeEvent = 7, tone = 'premium' } = body;
  if (!collectionId || !eventName || !eventDate) {
    return NextResponse.json({ error: 'collectionId, eventName, and eventDate are required' }, { status: 400 });
  }

  const eventTs = new Date(eventDate);
  const runTs = new Date(eventTs.getTime() - daysBeforeEvent * 86_400_000);
  const restoreTs = new Date(eventTs.getTime() + 86_400_000); // Restore day after event

  const { data: schedule, error } = await supabaseAdmin
    .from('seasonal_schedules')
    .insert({
      user_id: user.id,
      collection_id: collectionId,
      event_name: eventName,
      event_date: eventTs.toISOString(),
      run_date: runTs.toISOString(),
      restore_date: restoreTs.toISOString(),
      tone,
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  return NextResponse.json({ schedule });
}

/**
 * Called by the Vercel cron job to process due seasonal schedules.
 * POST /api/description-writer/seasonal/process (internal — no user auth, uses cron secret)
 */
export async function PATCH(request: NextRequest) {
  // Called by cron via internal secret
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();

  // ── Run scheduled refreshes ───────────────────────────────────────────────
  const { data: due } = await supabaseAdmin
    .from('seasonal_schedules')
    .select('*')
    .eq('status', 'scheduled')
    .lte('run_date', now.toISOString());

  for (const schedule of due ?? []) {
    try {
      await supabaseAdmin
        .from('seasonal_schedules')
        .update({ status: 'running' })
        .eq('id', schedule.id);

      const { data: ua } = await supabaseAdmin
        .from('user_automations')
        .select('shopify_store_url, shopify_access_token_encrypted')
        .eq('user_id', schedule.user_id)
        .in('status', ['active', 'trial'])
        .not('shopify_access_token_encrypted', 'is', null)
        .limit(1)
        .maybeSingle();

      if (!ua) continue;

      const accessToken = await decryptToken(ua.shopify_access_token_encrypted);
      const shopify = new ShopifyClient(ua.shopify_store_url, accessToken);

      const productIds = await shopify.getCollectionProducts(schedule.collection_id);

      for (const { id: productId } of productIds) {
        const product = await shopify.getProduct(productId);
        if (!product) continue;

        // Backup original description to history
        if (product.body_html) {
          const { data: genRecord } = await supabaseAdmin
            .from('description_generations')
            .insert({
              user_id: schedule.user_id,
              product_id: String(product.id),
              input_data: { trigger: 'seasonal_backup', scheduleId: schedule.id },
              output: product.body_html,
              tone: 'original',
              language: 'en',
            })
            .select('id')
            .single();
          if (genRecord?.id) {
            await supabaseAdmin.from('description_history')
              .insert({ generation_id: genRecord.id, output: product.body_html });
          }
        }

        // Generate seasonal version
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a Shopify product copywriter. Generate a ${schedule.event_name} themed product description in clean HTML (<p> and <ul>/<li>). Inject seasonal urgency, gift-angle copy, and ${schedule.event_name} language naturally. Tone: ${schedule.tone}.`,
          messages: [{ role: 'user', content: `Product: ${product.title}\n\nBase description: ${product.body_html?.replace(/<[^>]+>/g, ' ') ?? 'No existing description.'}` }],
        });

        const seasonal = (message.content[0] as Anthropic.TextBlock).text;
        await shopify.updateProduct(String(product.id), { body_html: seasonal } as any);
      }

      await supabaseAdmin
        .from('seasonal_schedules')
        .update({ status: 'complete' })
        .eq('id', schedule.id);
    } catch (err: any) {
      console.error(`[seasonal] Failed schedule ${schedule.id}:`, err.message);
    }
  }

  // ── Restore after event ───────────────────────────────────────────────────
  const { data: toRestore } = await supabaseAdmin
    .from('seasonal_schedules')
    .select('*')
    .eq('status', 'complete')
    .lte('restore_date', now.toISOString());

  for (const schedule of toRestore ?? []) {
    try {
      const { data: ua } = await supabaseAdmin
        .from('user_automations')
        .select('shopify_store_url, shopify_access_token_encrypted')
        .eq('user_id', schedule.user_id)
        .in('status', ['active', 'trial'])
        .not('shopify_access_token_encrypted', 'is', null)
        .limit(1)
        .maybeSingle();

      if (!ua) continue;

      const accessToken = await decryptToken(ua.shopify_access_token_encrypted);
      const shopify = new ShopifyClient(ua.shopify_store_url, accessToken);

      const productIds = await shopify.getCollectionProducts(schedule.collection_id);

      for (const { id: productId } of productIds) {
        // Retrieve the backup (original) description from history
        const { data: backup } = await supabaseAdmin
          .from('description_generations')
          .select('output')
          .eq('user_id', schedule.user_id)
          .eq('product_id', String(productId))
          .eq('tone', 'original')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (backup?.output) {
          await shopify.updateProduct(String(productId), { body_html: backup.output } as any);
        }
      }

      await supabaseAdmin
        .from('seasonal_schedules')
        .update({ status: 'restored' })
        .eq('id', schedule.id);
    } catch (err: any) {
      console.error(`[seasonal] Failed restore ${schedule.id}:`, err.message);
    }
  }

  return NextResponse.json({ success: true });
}
