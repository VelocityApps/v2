/**
 * Test script for Abandoned Cart Recovery automation.
 *
 * What it does:
 *   1. Finds (or lets you specify) an installed abandoned-cart-recovery user_automation
 *   2. Seeds a fake abandoned_carts row with abandoned_at = 73 h ago so all
 *      3 recovery emails are eligible to fire immediately
 *   3. Calls runScheduled() directly — same code path as the hourly cron
 *   4. Prints the resulting DB state and recent automation logs
 *
 * Usage:
 *   npx tsx scripts/test-abandoned-cart.ts
 *   npx tsx scripts/test-abandoned-cart.ts --ua <user_automation_id>
 *   npx tsx scripts/test-abandoned-cart.ts --email test@example.com --cleanup
 *
 * Flags:
 *   --ua <uuid>     Use a specific user_automation row (skip auto-detect)
 *   --email <addr>  Customer email to seed (default: test-cart@example.com)
 *   --cleanup       Delete the seeded cart row after the test
 *   --dry-run       Seed the row but skip runScheduled (inspect before firing)
 */

// Load env before any module that reads process.env at import time
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// ── parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flagVal = (name: string) => {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
};

const targetUaId = flagVal('--ua');
const testEmail  = flagVal('--email') ?? 'test-cart@example.com';
const cleanup    = args.includes('--cleanup');
const dryRun     = args.includes('--dry-run');

// ── Supabase admin client (bypasses RLS) ─────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── helpers ───────────────────────────────────────────────────────────────────
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`);
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {

  // ── 1. Resolve user_automation ──────────────────────────────────────────────
  section('1. Resolving user_automation');

  let userAutomation: any;

  if (targetUaId) {
    const { data, error } = await supabase
      .from('user_automations')
      .select('*')
      .eq('id', targetUaId)
      .single();
    if (error || !data) {
      console.error(`user_automation ${targetUaId} not found:`, error?.message);
      process.exit(1);
    }
    userAutomation = data;
  } else {
    const { data: rows, error } = await supabase
      .from('user_automations')
      .select('*, automations!inner(slug)')
      .eq('automations.slug', 'abandoned-cart-recovery')
      .order('installed_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('DB error looking up installations:', error.message);
      process.exit(1);
    }
    if (!rows || rows.length === 0) {
      console.error(
        'No abandoned-cart-recovery installations found.\n' +
        'Install the automation first, then re-run this script.\n' +
        'Or pass --ua <uuid> to target a specific row.'
      );
      process.exit(1);
    }
    if (rows.length > 1) {
      console.log('Multiple installs found — using the most recent:');
      rows.forEach((r: any, i: number) =>
        console.log(`  [${i}] ${r.id}  status=${r.status}  store=${r.shopify_store_url}`)
      );
    }
    userAutomation = rows[0];
  }

  console.log(`  id     : ${userAutomation.id}`);
  console.log(`  store  : ${userAutomation.shopify_store_url}`);
  console.log(`  status : ${userAutomation.status}`);
  console.log(`  config : ${JSON.stringify(userAutomation.config)}`);

  if (!userAutomation.shopify_access_token_encrypted) {
    console.warn('\nWARNING: No encrypted Shopify token on this row.');
    console.warn('Discount code creation (emails 2 & 3) will use placeholder codes.\n');
  }

  // ── 2. Seed fake abandoned cart ─────────────────────────────────────────────
  section('2. Seeding fake abandoned cart');

  const checkoutId = `test-${Date.now()}`;
  const abandonedAt = hoursAgo(73); // past all 3 email thresholds (1h, 24h, 72h)

  const cartRow = {
    user_automation_id: userAutomation.id,
    checkout_id: checkoutId,
    customer_email: testEmail,
    customer_name: 'Test Customer',
    cart_data: {
      line_items: [
        { title: 'Vintage Leather Wallet',  quantity: 1, price: '49.99' },
        { title: 'Merino Wool Socks (x3)',  quantity: 2, price: '19.99' },
      ],
      total_price: '89.97',
      currency: 'USD',
      restore_url: `https://${userAutomation.shopify_store_url}/checkouts/${checkoutId}`,
      store_name: userAutomation.shopify_store_url
        .replace('.myshopify.com', '')
        .replace(/-/g, ' '),
    },
    abandoned_at: abandonedAt,
    status: 'abandoned',
  };

  const { data: inserted, error: insertError } = await supabase
    .from('abandoned_carts')
    .insert(cartRow)
    .select()
    .single();

  if (insertError) {
    console.error('Failed to seed cart row:', insertError.message);
    process.exit(1);
  }

  const cartId = inserted.id;
  console.log(`  id           : ${cartId}`);
  console.log(`  checkout_id  : ${checkoutId}`);
  console.log(`  customer     : ${testEmail}`);
  console.log(`  abandoned_at : ${abandonedAt}  (73 h ago)`);

  if (dryRun) {
    section('DRY RUN — skipping runScheduled');
    console.log('Cart row inserted. Inspect it in Supabase, then run without --dry-run:');
    console.log(`  npx tsx scripts/test-abandoned-cart.ts --ua ${userAutomation.id} --cleanup`);
    process.exit(0);
  }

  // ── 3. Run the automation ───────────────────────────────────────────────────
  section('3. Running runScheduled()');

  // Dynamic import so env vars are loaded before module-level code in the
  // automation (supabase-server.ts reads env at import time).
  const { AbandonedCartRecovery } = await import('@/lib/automations/abandoned-cart-recovery/index');
  const automation = new AbandonedCartRecovery();

  const t0 = Date.now();
  try {
    await automation.runScheduled(userAutomation);
    console.log(`\n  Completed in ${Date.now() - t0} ms`);
  } catch (err: any) {
    console.error(`\n  runScheduled() threw: ${err.message}`);
    console.error(err.stack);
  }

  // ── 4. Cart state after run ─────────────────────────────────────────────────
  section('4. Cart row after runScheduled');

  const { data: cart } = await supabase
    .from('abandoned_carts')
    .select('*')
    .eq('id', cartId)
    .single();

  if (cart) {
    console.log(`  status          : ${cart.status}`);
    console.log(`  email_1_sent_at : ${cart.email_1_sent_at ?? '(not sent)'}`);
    console.log(`  email_2_sent_at : ${cart.email_2_sent_at ?? '(not sent)'}`);
    console.log(`  email_3_sent_at : ${cart.email_3_sent_at ?? '(not sent)'}`);
    console.log(`  discount_code_2 : ${cart.discount_code_2 ?? '(none)'}`);
    console.log(`  discount_code_3 : ${cart.discount_code_3 ?? '(none)'}`);
    const sent = [cart.email_1_sent_at, cart.email_2_sent_at, cart.email_3_sent_at].filter(Boolean).length;
    console.log(`\n  => ${sent}/3 emails fired`);
    if (sent < 3) {
      console.log('  Note: if 0 emails fired, check that Resend is configured and the');
      console.log('  automation logs below for error details.');
    }
  } else {
    console.log('  (cart row not found)');
  }

  // ── 5. Automation logs ──────────────────────────────────────────────────────
  section('5. Recent automation logs (last 10)');

  const { data: logs } = await supabase
    .from('automation_logs')
    .select('event_type, message, metadata, created_at')
    .eq('user_automation_id', userAutomation.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (logs && logs.length > 0) {
    [...logs].reverse().forEach((log: any) => {
      const ts   = new Date(log.created_at).toISOString().slice(11, 19);
      const meta = Object.keys(log.metadata ?? {}).length
        ? `  ${JSON.stringify(log.metadata)}`
        : '';
      console.log(`  [${ts}] ${log.event_type.toUpperCase().padEnd(7)} ${log.message}${meta}`);
    });
  } else {
    console.log('  (no logs found)');
  }

  // ── 6. Cleanup ──────────────────────────────────────────────────────────────
  section(cleanup ? '6. Cleanup' : '6. Cleanup (skipped — pass --cleanup to remove)');

  if (cleanup) {
    await supabase.from('abandoned_carts').delete().eq('id', cartId);
    console.log(`  Deleted cart row ${cartId}`);
  } else {
    console.log(`  Cart row ${cartId} left in DB.`);
  }

  section('Done');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
