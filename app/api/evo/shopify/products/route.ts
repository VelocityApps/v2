/**
 * GET /api/evo/shopify/products
 *
 * Returns the merchant's Shopify product catalogue merged with any existing
 * evo_sku_mappings, so the SKU mapper UI can pre-populate mapped SKUs and
 * show unmapped variants clearly.
 *
 * Response shape per variant:
 * {
 *   shopify_product_id:       string   // numeric Shopify product ID
 *   product_title:            string
 *   product_image:            string | null
 *   shopify_variant_id:       string   // numeric variant ID
 *   inventory_item_id:        string   // stored as platform_listing_id in evo_sku_mappings
 *   variant_title:            string   // "Default Title" if single-variant
 *   shopify_sku:              string   // the variant's own SKU field in Shopify
 *   current_quantity:         number
 *   master_sku:               string | null   // from evo_sku_mappings (null if not yet mapped)
 *   evo_mapping_id:           string | null   // existing evo_sku_mappings.id
 *   evo_product_id:           string | null   // existing evo_products.id
 * }
 *
 * Fetches up to 250 products (one Shopify page). Add ?page=N for subsequent
 * pages (250 products per page).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { decryptCredentials } from '@/lib/evo/encrypt';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1'));

  // ── Resolve Shopify platform connection ───────────────────────────────────────
  const { data: platform } = await supabaseAdmin
    .from('evo_platforms')
    .select('platform_account_id, credentials_encrypted, status')
    .eq('user_id', user.id)
    .eq('platform', 'shopify')
    .neq('status', 'disconnected')
    .maybeSingle();

  if (!platform) {
    return NextResponse.json(
      { error: 'No Shopify platform connected. Go to Evo → Platforms to connect.' },
      { status: 422 },
    );
  }

  // ── Decrypt credentials ───────────────────────────────────────────────────────
  let accessToken: string;
  try {
    const creds = JSON.parse(await decryptCredentials(platform.credentials_encrypted));
    accessToken = creds.access_token;
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt Shopify credentials' }, { status: 500 });
  }

  const shopDomain = platform.platform_account_id;

  // ── Fetch products from Shopify ────────────────────────────────────────────────
  // Fields: id, title, images, variants (id, title, sku, inventory_item_id, inventory_quantity)
  const shopifyUrl =
    `https://${shopDomain}/admin/api/2024-01/products.json` +
    `?limit=250&page=${page}&fields=id,title,images,variants`;

  const shopifyRes = await fetch(shopifyUrl, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  });

  if (!shopifyRes.ok) {
    const text = await shopifyRes.text();
    console.error('[Evo/Products] Shopify API error:', shopifyRes.status, text);
    return NextResponse.json({ error: 'Failed to fetch products from Shopify' }, { status: 502 });
  }

  const { products: shopifyProducts } = await shopifyRes.json() as { products: any[] };

  // ── Load existing evo_sku_mappings for Shopify ─────────────────────────────────
  // Indexed by platform_listing_id (= inventory_item_id) for O(1) lookup
  const { data: existingMappings } = await supabaseAdmin
    .from('evo_sku_mappings')
    .select('id, master_sku, platform_listing_id, product_id')
    .eq('user_id', user.id)
    .eq('platform', 'shopify');

  const mappingByInventoryItemId = new Map<string, { id: string; master_sku: string; product_id: string }>(
    (existingMappings ?? []).map((m) => [m.platform_listing_id, m]),
  );

  // ── Merge and flatten to variant-level rows ───────────────────────────────────
  const variants: object[] = [];

  for (const product of shopifyProducts) {
    const productImage: string | null = product.images?.[0]?.src ?? null;

    for (const variant of (product.variants ?? [])) {
      const inventoryItemId = String(variant.inventory_item_id);
      const existing = mappingByInventoryItemId.get(inventoryItemId);

      variants.push({
        shopify_product_id:  String(product.id),
        product_title:       product.title ?? '',
        product_image:       productImage,
        shopify_variant_id:  String(variant.id),
        inventory_item_id:   inventoryItemId,
        variant_title:       variant.title === 'Default Title' ? '' : (variant.title ?? ''),
        shopify_sku:         variant.sku ?? '',
        current_quantity:    variant.inventory_quantity ?? 0,
        master_sku:          existing?.master_sku ?? null,
        evo_mapping_id:      existing?.id ?? null,
        evo_product_id:      existing?.product_id ?? null,
      });
    }
  }

  return NextResponse.json({
    variants,
    total_products: shopifyProducts.length,
    page,
    has_more: shopifyProducts.length === 250,
  });
}
