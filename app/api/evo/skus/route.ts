/**
 * POST /api/evo/skus
 *
 * Batch-saves SKU mappings for Shopify variants.
 *
 * Body:
 * {
 *   mappings: Array<{
 *     shopify_product_id:  string
 *     product_title:       string
 *     product_image:       string | null
 *     inventory_item_id:   string   // stored as platform_listing_id
 *     shopify_variant_id:  string   // stored as platform_variant_id
 *     variant_title:       string
 *     master_sku:          string   // empty string = remove / skip this variant
 *     current_quantity:    number
 *     evo_mapping_id:      string | null   // existing mapping row id, if any
 *     evo_product_id:      string | null   // existing product row id, if any
 *   }>
 * }
 *
 * Logic per variant:
 *   - If master_sku is blank AND evo_mapping_id exists → delete the mapping
 *   - If master_sku is blank AND no mapping → skip
 *   - If master_sku is set AND evo_mapping_id exists → update master_sku (+ product if needed)
 *   - If master_sku is set AND no mapping → find/create evo_products, insert evo_sku_mappings
 *   - Always upsert evo_inventory_levels for the (final) mapping id
 *
 * NOTE: evo_sku_mappings has UNIQUE(user_id, master_sku, platform). If a user
 * assigns the same master_sku to two different variants on the same platform
 * this will conflict. The API returns a clear error in that case.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

interface IncomingMapping {
  shopify_product_id: string;
  product_title: string;
  product_image: string | null;
  inventory_item_id: string;
  shopify_variant_id: string;
  variant_title: string;
  master_sku: string;
  current_quantity: number;
  evo_mapping_id: string | null;
  evo_product_id: string | null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Parse body ────────────────────────────────────────────────────────────────
  let body: { mappings?: IncomingMapping[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { mappings } = body;
  if (!Array.isArray(mappings) || mappings.length === 0) {
    return NextResponse.json({ error: 'mappings array is required' }, { status: 400 });
  }

  // ── Resolve evo_products ids for each unique shopify_product_id ───────────────
  // We store shopify_product_id in evo_products.metadata so we can look them up.
  const uniqueProductIds = [...new Set(
    mappings.filter((m) => m.master_sku.trim()).map((m) => m.shopify_product_id),
  )];

  // Pull all existing evo_products for this user so we can check metadata client-side
  // (PostgREST JSONB filtering is possible but brittle; this is simpler for small sets)
  const { data: existingProducts } = await supabaseAdmin
    .from('evo_products')
    .select('id, metadata')
    .eq('user_id', user.id);

  const productIdByShopifyId = new Map<string, string>(
    (existingProducts ?? [])
      .filter((p) => p.metadata?.shopify_product_id)
      .map((p) => [String(p.metadata.shopify_product_id), p.id as string]),
  );

  // Create missing evo_products records
  for (const shopifyProductId of uniqueProductIds) {
    if (productIdByShopifyId.has(shopifyProductId)) continue;

    // Get product info from the first mapping for this product
    const sample = mappings.find((m) => m.shopify_product_id === shopifyProductId)!;

    const { data: newProduct, error: insertErr } = await supabaseAdmin
      .from('evo_products')
      .insert({
        user_id: user.id,
        title: sample.product_title,
        images: sample.product_image ? [{ url: sample.product_image }] : [],
        metadata: { shopify_product_id: shopifyProductId },
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[Evo/SKUs] Failed to create evo_product:', insertErr);
      continue;
    }
    productIdByShopifyId.set(shopifyProductId, newProduct.id);
  }

  // ── Process each mapping ──────────────────────────────────────────────────────
  let saved = 0;
  let removed = 0;
  const errors: string[] = [];

  for (const m of mappings) {
    const masterSku = m.master_sku.trim();

    // ── Blank master_sku → remove existing mapping (if any) ─────────────────────
    if (!masterSku) {
      if (m.evo_mapping_id) {
        const { error } = await supabaseAdmin
          .from('evo_sku_mappings')
          .delete()
          .eq('id', m.evo_mapping_id)
          .eq('user_id', user.id);

        if (error) {
          errors.push(`Failed to remove mapping for ${m.inventory_item_id}: ${error.message}`);
        } else {
          removed++;
        }
      }
      continue;
    }

    // ── Has a master_sku ─────────────────────────────────────────────────────────
    const productId =
      m.evo_product_id ??
      productIdByShopifyId.get(m.shopify_product_id) ??
      null;

    if (!productId) {
      errors.push(`Could not resolve product for Shopify product ${m.shopify_product_id}`);
      continue;
    }

    let finalMappingId: string | null = m.evo_mapping_id;

    if (m.evo_mapping_id) {
      // Update existing mapping
      const { error } = await supabaseAdmin
        .from('evo_sku_mappings')
        .update({ master_sku: masterSku, product_id: productId })
        .eq('id', m.evo_mapping_id)
        .eq('user_id', user.id);

      if (error) {
        // Unique constraint violation — duplicate master_sku on this platform
        if (error.code === '23505') {
          errors.push(`Master SKU "${masterSku}" is already assigned to another Shopify listing.`);
        } else {
          errors.push(`Failed to update mapping for ${masterSku}: ${error.message}`);
        }
        continue;
      }
    } else {
      // Insert new mapping
      const { data: newMapping, error } = await supabaseAdmin
        .from('evo_sku_mappings')
        .insert({
          product_id: productId,
          user_id: user.id,
          master_sku: masterSku,
          platform: 'shopify',
          platform_listing_id: m.inventory_item_id,
          platform_variant_id: m.shopify_variant_id,
        })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          errors.push(`Master SKU "${masterSku}" is already assigned to another Shopify listing.`);
        } else {
          errors.push(`Failed to create mapping for ${masterSku}: ${error.message}`);
        }
        continue;
      }

      finalMappingId = newMapping.id;
    }

    saved++;

    // ── Upsert inventory level with current Shopify quantity ─────────────────────
    if (finalMappingId) {
      await supabaseAdmin
        .from('evo_inventory_levels')
        .upsert(
          {
            sku_mapping_id: finalMappingId,
            user_id: user.id,
            quantity: m.current_quantity,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: 'sku_mapping_id' },
        );
    }
  }

  return NextResponse.json({ saved, removed, errors });
}

/**
 * DELETE /api/evo/skus
 *
 * Deletes all evo_sku_mappings (and cascades to evo_inventory_levels) for the
 * authenticated user. Used for a "clear all mappings" reset action.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabaseAdmin
    .from('evo_sku_mappings')
    .delete()
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
