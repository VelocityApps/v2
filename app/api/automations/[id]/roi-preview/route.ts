import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { validateUUID } from '@/lib/validation';

interface StoreData {
  ordersLast30: number;
  avgOrderValue: number;
  revenueLast30: number;
  unpaidOrders: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  totalProducts: number;
  newCustomersLast30: number;
  fulfilledOrdersLast30: number;
}

interface RoiResult {
  headline: string;
  subtext: string;
  estimatedMonthlyValue: number;
  metrics: { label: string; value: string }[];
}

function calculateRoi(slug: string, d: StoreData): RoiResult {
  const {
    ordersLast30, avgOrderValue, revenueLast30, unpaidOrders,
    outOfStockProducts, lowStockProducts, totalProducts,
    newCustomersLast30, fulfilledOrdersLast30,
  } = d;

  switch (slug) {
    case 'abandoned-cart-recovery': {
      const estimatedAbandoned = Math.max(Math.round(ordersLast30 * 2.3), 1);
      const recoverable = Math.max(Math.round(estimatedAbandoned * 0.10), 1);
      const value = Math.round(recoverable * avgOrderValue);
      return {
        headline: `~${recoverable} recoverable cart${recoverable !== 1 ? 's' : ''}/month`,
        subtext: `Based on your ${ordersLast30} orders in the last 30 days`,
        estimatedMonthlyValue: value,
        metrics: [
          { label: 'Est. abandoned carts/month', value: String(estimatedAbandoned) },
          { label: 'Recovery rate (industry avg)', value: '10%' },
          { label: 'Est. revenue recovered/month', value: `$${value.toLocaleString()}` },
        ],
      };
    }

    case 'review-request-automator': {
      const reviews = Math.round(fulfilledOrdersLast30 * 0.12);
      const lift = Math.round(revenueLast30 * 0.03);
      return {
        headline: `~${reviews} new reviews/month`,
        subtext: `From your ${fulfilledOrdersLast30} fulfilled orders last month`,
        estimatedMonthlyValue: lift,
        metrics: [
          { label: 'Fulfilled orders/month', value: String(fulfilledOrdersLast30) },
          { label: 'Est. new reviews/month', value: String(reviews) },
          { label: 'Avg conversion lift', value: '~3% revenue' },
        ],
      };
    }

    case 'low-stock-alerts': {
      const lost = Math.round(lowStockProducts * avgOrderValue * 3);
      return {
        headline: `${lowStockProducts} products near out-of-stock`,
        subtext: `Get alerts before you lose sales on these items`,
        estimatedMonthlyValue: lost,
        metrics: [
          { label: 'Low-stock products', value: String(lowStockProducts) },
          { label: 'Potential lost sales prevented', value: `$${lost.toLocaleString()}` },
          { label: 'Alert lead time', value: 'Configurable' },
        ],
      };
    }

    case 'auto-cancel-unpaid-orders': {
      const timeSaved = Math.round(unpaidOrders * 3);
      return {
        headline: `${unpaidOrders} unpaid orders to clean up`,
        subtext: `Auto-cancel and free up inventory automatically`,
        estimatedMonthlyValue: 0,
        metrics: [
          { label: 'Unpaid orders (last 30d)', value: String(unpaidOrders) },
          { label: 'Manual minutes saved/month', value: `~${timeSaved} min` },
          { label: 'Inventory freed instantly', value: 'Yes' },
        ],
      };
    }

    case 'auto-hide-out-of-stock': {
      return {
        headline: `${outOfStockProducts} products currently out of stock`,
        subtext: `Hide them automatically, re-publish when restocked`,
        estimatedMonthlyValue: 0,
        metrics: [
          { label: 'Out-of-stock products', value: String(outOfStockProducts) },
          { label: 'Bounce rate reduction', value: '~8%' },
          { label: 'Auto re-publishes on restock', value: 'Yes' },
        ],
      };
    }

    case 'back-in-stock-alerts': {
      const demand = Math.round(outOfStockProducts * avgOrderValue * 0.2);
      return {
        headline: `${outOfStockProducts} out-of-stock items with pent-up demand`,
        subtext: `Notify waitlisted shoppers the moment stock returns`,
        estimatedMonthlyValue: demand,
        metrics: [
          { label: 'Out-of-stock products', value: String(outOfStockProducts) },
          { label: 'Est. demand recovery/month', value: `$${demand.toLocaleString()}` },
          { label: 'Alert-to-purchase rate', value: '~20%' },
        ],
      };
    }

    case 'best-sellers-collection': {
      const lift = Math.round(revenueLast30 * 0.05);
      return {
        headline: `Auto-curated from your ${ordersLast30} recent orders`,
        subtext: `Surface your proven best sellers to every visitor`,
        estimatedMonthlyValue: lift,
        metrics: [
          { label: 'Orders analysed', value: String(ordersLast30) },
          { label: 'Est. conversion uplift', value: '~5%' },
          { label: 'Est. additional revenue/month', value: `$${lift.toLocaleString()}` },
        ],
      };
    }

    case 'post-purchase-upsell': {
      const upsell = Math.round(fulfilledOrdersLast30 * avgOrderValue * 0.12);
      return {
        headline: `${fulfilledOrdersLast30} post-purchase opportunities/month`,
        subtext: `Add revenue after checkout with targeted offers`,
        estimatedMonthlyValue: upsell,
        metrics: [
          { label: 'Fulfilled orders/month', value: String(fulfilledOrdersLast30) },
          { label: 'Avg upsell take rate', value: '12%' },
          { label: 'Est. additional revenue/month', value: `$${upsell.toLocaleString()}` },
        ],
      };
    }

    case 'win-back-campaign': {
      const lapsed = Math.max(Math.round(newCustomersLast30 * 3), 10);
      const winback = Math.round(lapsed * 0.05 * avgOrderValue);
      return {
        headline: `~${lapsed} lapsed customers to win back`,
        subtext: `Re-engage customers who haven't bought in 90+ days`,
        estimatedMonthlyValue: winback,
        metrics: [
          { label: 'Est. lapsed customers', value: String(lapsed) },
          { label: 'Win-back rate', value: '~5%' },
          { label: 'Est. recovered revenue/month', value: `$${winback.toLocaleString()}` },
        ],
      };
    }

    case 'welcome-email-series': {
      const conversions = Math.round(newCustomersLast30 * 0.08);
      const revenue = Math.round(conversions * avgOrderValue);
      return {
        headline: `${newCustomersLast30} new customers last month`,
        subtext: `Convert first-timers into loyal buyers automatically`,
        estimatedMonthlyValue: revenue,
        metrics: [
          { label: 'New customers/month', value: String(newCustomersLast30) },
          { label: 'Repeat-buy rate lift', value: '~8%' },
          { label: 'Est. second-purchase revenue', value: `$${revenue.toLocaleString()}` },
        ],
      };
    }

    default: {
      return {
        headline: `${totalProducts} products · ${ordersLast30} orders last month`,
        subtext: `This automation will run automatically on your store`,
        estimatedMonthlyValue: 0,
        metrics: [
          { label: 'Orders (last 30d)', value: String(ordersLast30) },
          { label: 'Monthly revenue', value: `$${revenueLast30.toLocaleString()}` },
          { label: 'Products', value: String(totalProducts) },
        ],
      };
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!validateUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*, automation:automations(slug, name, price_monthly)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!userAutomation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!userAutomation.shopify_access_token_encrypted) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const slug: string = userAutomation.automation?.slug ?? '';
    const priceMonthly: number = userAutomation.automation?.price_monthly ?? 0;

    const shopify = await ShopifyClient.fromEncryptedToken(
      userAutomation.shopify_store_url,
      userAutomation.shopify_access_token_encrypted
    );

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [recentOrders, products] = await Promise.all([
      shopify.getOrders(50, 'any', thirtyDaysAgo).catch(() => []),
      shopify.getProducts(250).catch(() => []),
    ]);

    const ordersLast30 = recentOrders.length;
    const revenueLast30 = Math.round(recentOrders.reduce((s, o) => s + parseFloat(o.total_price || '0'), 0));
    const avgOrderValue = ordersLast30 > 0 ? Math.round(revenueLast30 / ordersLast30) : 50;
    const unpaidOrders = recentOrders.filter(o => o.financial_status === 'pending' && !o.cancelled_at).length;
    const fulfilledOrdersLast30 = recentOrders.filter(o => o.fulfillment_status === 'fulfilled').length;

    const outOfStockProducts = products.filter(p => p.variants.every(v => v.inventory_quantity <= 0)).length;
    const lowStockProducts = products.filter(p =>
      p.variants.some(v => v.inventory_quantity > 0 && v.inventory_quantity <= 5)
    ).length;
    const totalProducts = products.length;
    const newCustomersLast30 = new Set(recentOrders.map(o => o.email).filter(Boolean)).size;

    const roi = calculateRoi(slug, {
      ordersLast30,
      avgOrderValue,
      revenueLast30,
      unpaidOrders,
      outOfStockProducts,
      lowStockProducts,
      totalProducts,
      newCustomersLast30,
      fulfilledOrdersLast30,
    });

    return NextResponse.json({
      ...roi,
      priceMonthly,
      roiMultiple: roi.estimatedMonthlyValue > 0 && priceMonthly > 0
        ? Math.round(roi.estimatedMonthlyValue / priceMonthly)
        : null,
    });
  } catch (error: any) {
    console.error('[roi-preview]', error);
    return NextResponse.json({ error: error.message || 'Failed to load preview' }, { status: 500 });
  }
}
