import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * POST /api/back-in-stock/subscribe
 * Lets a customer sign up for a back-in-stock notification.
 *
 * Body: { email, product_id, shop, variant_id? }
 *
 * The merchant embeds a "Notify me" form on their product page that POSTs here.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, product_id, shop, variant_id } = await request.json();

    if (!email || !product_id || !shop) {
      return NextResponse.json({ error: 'email, product_id and shop are required' }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Find the active back-in-stock-alerts automation for this shop
    const shopNormalized = (shop as string).replace(/^https?:\/\//i, '').replace(/\/$/, '');
    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('id, automations!inner(slug)')
      .in('status', ['active', 'trial'])
      .or(`shopify_store_url.eq.${shopNormalized},shopify_store_url.eq.https://${shopNormalized}`)
      .eq('automations.slug', 'back-in-stock-alerts')
      .maybeSingle();

    if (!userAutomation) {
      return NextResponse.json({ error: 'Back-in-stock alerts not enabled for this store' }, { status: 404 });
    }

    // Upsert — ignore duplicate signups
    const { error } = await supabaseAdmin
      .from('back_in_stock_subscribers')
      .upsert(
        {
          user_automation_id: userAutomation.id,
          product_id: String(product_id),
          variant_id: variant_id ? String(variant_id) : null,
          customer_email: email.toLowerCase().trim(),
        },
        { onConflict: 'user_automation_id,product_id,customer_email', ignoreDuplicates: true }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, message: "You'll be notified when this item is back in stock." });
  } catch (err: any) {
    console.error('[back-in-stock/subscribe] Error:', err);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
