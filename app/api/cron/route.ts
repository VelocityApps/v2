/**
 * Cron Job Endpoint
 * Runs scheduled automations (e.g., Best Sellers Collection) and the Evo
 * inventory reconciliation pass.
 *
 * Set up in Vercel: https://vercel.com/docs/cron-jobs
 * Or use external service like cron-job.org
 */

import '@/lib/automations/load-all';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';
import { processInventoryUpdate } from '@/lib/evo/sync';
import { decryptCredentials } from '@/lib/evo/encrypt';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // CRON_SECRET must be a non-empty string of at least 20 chars
    if (!CRON_SECRET || CRON_SECRET.length < 20) {
      console.error('[Cron] CRON_SECRET is not set or too short (min 20 chars)');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active automations that need to run
    const now = new Date().toISOString();
    
    const { data: userAutomations, error } = await supabaseAdmin
      .from('user_automations')
      .select(`
        *,
        automations (
          slug
        )
      `)
      .in('status', ['active', 'trial'])
      .lte('next_run_at', now)
      .not('next_run_at', 'is', null);

    if (error) {
      console.error('[Cron] Error fetching automations:', error);
      return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 });
    }

    if (!userAutomations || userAutomations.length === 0) {
      return NextResponse.json({ 
        message: 'No automations scheduled to run',
        count: 0 
      });
    }

    // Run all automations in parallel — each failure is isolated
    const settled = await Promise.allSettled(
      userAutomations.map(async (userAutomation) => {
        const automationSlug = (userAutomation as any).automations?.slug;
        if (!automationSlug) throw new Error(`No slug for automation_id ${userAutomation.automation_id}`);

        const automation = getAutomation(automationSlug);
        if (!automation) throw new Error(`Automation not found: ${automationSlug}`);
        if (!automation.runScheduled) return { skipped: true, slug: automationSlug };

        console.log(`[Cron] Running: ${automationSlug} for user ${userAutomation.user_id}`);
        await automation.runScheduled(userAutomation);
        return { slug: automationSlug };
      })
    );

    // Persist error status for failed automations
    await Promise.all(
      settled.map(async (result, i) => {
        if (result.status === 'rejected') {
          const ua = userAutomations[i];
          console.error(`[Cron] Error running automation ${ua.id}:`, result.reason);
          await supabaseAdmin
            .from('user_automations')
            .update({ status: 'error', error_message: result.reason?.message, updated_at: new Date().toISOString() })
            .eq('id', ua.id);
        }
      })
    );

    const results = settled.map((result, i) => ({
      automation_id: userAutomations[i].id,
      ...(result.status === 'fulfilled'
        ? { status: (result.value as any)?.skipped ? 'skipped' : 'success' }
        : { status: 'error', error: result.reason?.message }),
    }));

    // ── Evo inventory reconciliation ─────────────────────────────────────────
    // Fire-and-forget — reconciliation failures must never block automation runs.
    runEvoReconciliation().catch((err: any) =>
      console.error('[Cron/Evo] Reconciliation threw unexpectedly:', err?.message),
    );

    return NextResponse.json({
      message: `Processed ${userAutomations.length} automations`,
      count: userAutomations.length,
      results,
    });

  } catch (error: any) {
    console.error('[Cron] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// Also support POST for external cron services
export async function POST(request: NextRequest) {
  return GET(request);
}

// ── Evo reconciliation ────────────────────────────────────────────────────────
/**
 * For every active Shopify platform in Evo:
 *   1. Load the merchant's SKU mappings (platform = 'shopify').
 *   2. Batch-fetch live inventory levels from the Shopify REST API.
 *   3. Compare each against the stored evo_inventory_levels value.
 *   4. Where they differ, call processInventoryUpdate() — this updates the DB,
 *      fires low-stock alerts if needed, and propagates to sibling platforms.
 *
 * Shopify's /inventory_levels.json endpoint accepts up to 50 inventory_item_ids
 * per request, so large catalogs are chunked.
 */
async function runEvoReconciliation(): Promise<void> {
  // Load all active Shopify Evo platforms
  const { data: platforms, error: platErr } = await supabaseAdmin
    .from('evo_platforms')
    .select('user_id, platform_account_id, credentials_encrypted, metadata')
    .eq('platform', 'shopify')
    .eq('status', 'active');

  if (platErr) {
    console.error('[Cron/Evo] Failed to load platforms:', platErr.message);
    return;
  }
  if (!platforms?.length) return;

  let totalReconciled = 0;
  let totalDrifted    = 0;

  await Promise.allSettled(
    platforms.map(async (plat) => {
      try {
        const drifted = await reconcileShopifyPlatform(plat);
        totalReconciled++;
        totalDrifted += drifted;
      } catch (err: any) {
        console.error(
          `[Cron/Evo] Reconciliation failed for ${plat.platform_account_id}:`,
          err.message,
        );
      }
    }),
  );

  console.log(
    `[Cron/Evo] Reconciliation complete — ${totalReconciled} shops, ${totalDrifted} levels corrected`,
  );
}

const SHOPIFY_CHUNK_SIZE = 50; // max inventory_item_ids per /inventory_levels.json request

async function reconcileShopifyPlatform(plat: {
  user_id: string;
  platform_account_id: string;
  credentials_encrypted: string;
  metadata: Record<string, unknown> | null;
}): Promise<number> {
  const { user_id: userId, platform_account_id: shopDomain, credentials_encrypted, metadata } = plat;

  const locationId = String(metadata?.primary_location_id ?? '');
  if (!locationId) {
    console.warn(`[Cron/Evo] ${shopDomain}: no primary_location_id in metadata — skipping`);
    return 0;
  }

  // Decrypt access token
  const creds = JSON.parse(await decryptCredentials(credentials_encrypted)) as Record<string, string>;
  const accessToken = creds.access_token;
  if (!accessToken) {
    console.warn(`[Cron/Evo] ${shopDomain}: credentials missing access_token — skipping`);
    return 0;
  }

  // Load all Shopify SKU mappings for this user
  const { data: mappings } = await supabaseAdmin
    .from('evo_sku_mappings')
    .select('id, platform_listing_id, evo_inventory_levels!sku_mapping_id(quantity)')
    .eq('user_id', userId)
    .eq('platform', 'shopify');

  if (!mappings?.length) return 0;

  // Build a lookup: inventory_item_id → { mapping_id, stored_quantity }
  const mappingIndex = new Map<string, { mappingId: string; storedQty: number | null }>();
  for (const m of mappings) {
    const level = Array.isArray(m.evo_inventory_levels)
      ? m.evo_inventory_levels[0]
      : m.evo_inventory_levels;
    mappingIndex.set(m.platform_listing_id, {
      mappingId: m.id,
      storedQty: level?.quantity ?? null,
    });
  }

  const allInventoryItemIds = [...mappingIndex.keys()];
  let driftCount = 0;

  // Process in chunks of 50
  for (let i = 0; i < allInventoryItemIds.length; i += SHOPIFY_CHUNK_SIZE) {
    const chunk = allInventoryItemIds.slice(i, i + SHOPIFY_CHUNK_SIZE);
    const qs = new URLSearchParams({
      location_ids: locationId,
      inventory_item_ids: chunk.join(','),
      limit: '250',
    });

    const res = await fetch(
      `https://${shopDomain}/admin/api/2024-01/inventory_levels.json?${qs}`,
      { headers: { 'X-Shopify-Access-Token': accessToken } },
    );

    if (!res.ok) {
      const body = await res.text();
      console.warn(`[Cron/Evo] ${shopDomain}: inventory_levels fetch failed: ${res.status} ${body}`);
      continue;
    }

    const { inventory_levels } = await res.json() as {
      inventory_levels: Array<{ inventory_item_id: number; available: number }>;
    };

    // Compare and reconcile each level
    for (const lvl of inventory_levels) {
      const itemId = String(lvl.inventory_item_id);
      const entry  = mappingIndex.get(itemId);
      if (!entry) continue;

      const liveQty = lvl.available ?? 0;
      if (entry.storedQty !== null && entry.storedQty === liveQty) continue;

      // Drift detected — drive it through processInventoryUpdate so alerts
      // and cross-platform propagation fire correctly.
      await processInventoryUpdate({
        userId,
        skuMappingId: entry.mappingId,
        newQuantity: liveQty,
        sourcePlatform: 'shopify',
        sourceEventId: null, // reconciliation events are not idempotency-keyed
        trigger: 'reconciliation',
        metadata: { reconciliation: true, location_id: locationId },
      });
      driftCount++;
    }
  }

  // Stamp last_synced_at on the platform record
  await supabaseAdmin
    .from('evo_platforms')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('platform', 'shopify');

  if (driftCount > 0) {
    console.log(`[Cron/Evo] ${shopDomain}: corrected ${driftCount} drifted inventory level(s)`);
  }

  return driftCount;
}



