import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/seasonal
 * Runs daily at 06:00 UTC via Vercel Cron.
 * Processes due seasonal refresh schedules and post-event restores.
 */
export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    console.error('[cron/seasonal] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  let refreshed = 0;
  let restored = 0;

  // ── Run scheduled refreshes ─────────────────────────────────────────────────
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

      const ua = await getStore(schedule.user_id);
      if (!ua) { console.warn(`[cron/seasonal] No store for user ${schedule.user_id}`); continue; }

      const accessToken = await decryptToken(ua.shopify_access_token_encrypted);
      const shopify = new ShopifyClient(ua.shopify_store_url, accessToken);
      const productRefs = await shopify.getCollectionProducts(schedule.collection_id);

      for (const { id: productId } of productRefs) {
        try {
          const product = await shopify.getProduct(productId);
          if (!product) continue;

          // Back up original description
          if (product.body_html) {
            const { data: gen } = await supabaseAdmin
              .from('description_generations')
              .insert({
                user_id: schedule.user_id,
                product_id: String(product.id),
                input_data: { trigger: 'seasonal_backup', scheduleId: schedule.id, eventName: schedule.event_name },
                output: product.body_html,
                tone: 'original',
                language: 'en',
              })
              .select('id')
              .single();
            if (gen?.id) {
              await supabaseAdmin.from('description_history')
                .insert({ generation_id: gen.id, output: product.body_html });
            }
          }

          // Generate seasonal version
          const msg = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: buildSeasonalPrompt(schedule.event_name, schedule.tone),
            messages: [{
              role: 'user',
              content: `Product: ${product.title}\n\nCurrent description (base for rewrite):\n${
                product.body_html?.replace(/<[^>]+>/g, ' ').trim() || 'No existing description.'
              }`,
            }],
          });

          const seasonal = (msg.content[0] as Anthropic.TextBlock).text;
          await shopify.updateProduct(String(product.id), { body_html: seasonal } as any);

          await supabaseAdmin.from('description_generations').insert({
            user_id: schedule.user_id,
            product_id: String(product.id),
            input_data: { trigger: 'seasonal', scheduleId: schedule.id, eventName: schedule.event_name },
            output: seasonal,
            tone: schedule.tone,
            language: 'en',
          });
        } catch (err: any) {
          console.error(`[cron/seasonal] Product ${productId} failed:`, err.message);
        }
      }

      await supabaseAdmin
        .from('seasonal_schedules')
        .update({ status: 'complete' })
        .eq('id', schedule.id);

      refreshed++;
    } catch (err: any) {
      console.error(`[cron/seasonal] Schedule ${schedule.id} failed:`, err.message);
    }
  }

  // ── Restore originals after event ──────────────────────────────────────────
  const { data: toRestore } = await supabaseAdmin
    .from('seasonal_schedules')
    .select('*')
    .eq('status', 'complete')
    .lte('restore_date', now.toISOString());

  for (const schedule of toRestore ?? []) {
    try {
      const ua = await getStore(schedule.user_id);
      if (!ua) continue;

      const accessToken = await decryptToken(ua.shopify_access_token_encrypted);
      const shopify = new ShopifyClient(ua.shopify_store_url, accessToken);
      const productRefs = await shopify.getCollectionProducts(schedule.collection_id);

      for (const { id: productId } of productRefs) {
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

      restored++;
    } catch (err: any) {
      console.error(`[cron/seasonal] Restore ${schedule.id} failed:`, err.message);
    }
  }

  return NextResponse.json({ success: true, refreshed, restored });
}

export const POST = GET;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getStore(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_automations')
    .select('shopify_store_url, shopify_access_token_encrypted')
    .eq('user_id', userId)
    .in('status', ['active', 'trial'])
    .not('shopify_access_token_encrypted', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function buildSeasonalPrompt(eventName: string, tone: string): string {
  const toneMap: Record<string, string> = {
    casual: 'friendly and conversational',
    premium: 'elevated and sophisticated',
    technical: 'precise and informative',
    playful: 'fun and energetic',
  };
  return `You are a Shopify product copywriter specialising in seasonal campaigns.

Rewrite the product description with ${eventName} seasonal themes injected naturally.
Tone: ${toneMap[tone] ?? toneMap.premium}.

Seasonal guidelines:
- Weave in ${eventName} language, gift-angle copy, and seasonal urgency
- Keep the core product benefits intact — just add seasonal context
- Add a time-sensitive CTA ("Order before [event]", "Perfect ${eventName} gift", etc.)
- Output clean HTML only: one <p> intro, <ul>/<li> benefits, one <p> CTA

Do not make the description feel like a generic seasonal template — it must still feel specific to this product.`;
}
