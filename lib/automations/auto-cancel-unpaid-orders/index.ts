/**
 * Auto-Cancel Unpaid Orders
 *
 * Runs on a cron (hourly) and cancels orders that have been pending payment
 * for longer than config.cancel_after_hours (default 24 h).
 *
 * Config:
 *   cancel_after_hours   Hours before an unpaid order is cancelled (default 24)
 *   notify_customer      Send Shopify's cancellation email to customer (default false)
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const CRON_INTERVAL_HOURS = 1;

export class AutoCancelUnpaidOrders extends BaseAutomation {
  name = 'Auto-Cancel Unpaid Orders';
  slug = 'auto-cancel-unpaid-orders';

  async install(userAutomationId: string): Promise<void> {
    await supabaseAdmin
      .from('user_automations')
      .update({ next_run_at: hoursFromNow(CRON_INTERVAL_HOURS) })
      .eq('id', userAutomationId);

    await this.log(userAutomationId, 'success', 'Installed – will auto-cancel unpaid orders hourly');
  }

  async uninstall(userAutomationId: string): Promise<void> {
    await supabaseAdmin
      .from('user_automations')
      .update({ next_run_at: null })
      .eq('id', userAutomationId);

    await this.log(userAutomationId, 'info', 'Uninstalled');
  }

  async handleWebhook(
    _topic: string,
    _payload: ShopifyWebhookPayload,
    _userAutomation: UserAutomation
  ): Promise<void> {
    // No webhooks — purely cron-driven
  }

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    const config = userAutomation.config || {};
    const cancelAfterHours: number = config.cancel_after_hours != null ? Number(config.cancel_after_hours) : 24;
    const notifyCustomer: boolean = config.notify_customer === true;

    const cutoff = new Date(Date.now() - cancelAfterHours * 3_600_000).toISOString();

    const shopify = await this.getShopifyClient(userAutomation);

    // Fetch open orders with pending payment created before the cutoff
    const orders = await shopify.getOrders(250, 'open', undefined);
    const unpaid = orders.filter(
      (o: any) =>
        o.financial_status === 'pending' &&
        new Date(o.created_at).toISOString() < cutoff
    );

    if (unpaid.length === 0) {
      await this.log(userAutomation.id, 'info', 'No unpaid orders to cancel');
    } else {
      for (const order of unpaid) {
        try {
          await shopify.cancelOrder(String(order.id), notifyCustomer);
          await this.log(
            userAutomation.id,
            'success',
            `Cancelled unpaid order ${order.name} (unpaid for >${cancelAfterHours}h)`,
            { order_id: String(order.id), order_name: order.name }
          );
        } catch (err: any) {
          await this.log(
            userAutomation.id,
            'error',
            `Failed to cancel order ${order.name}: ${err.message}`
          );
        }
      }
    }

    await supabaseAdmin
      .from('user_automations')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: hoursFromNow(CRON_INTERVAL_HOURS),
      })
      .eq('id', userAutomation.id);
  }
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

import { registerAutomation } from '../base';
registerAutomation(AutoCancelUnpaidOrders);
