/**
 * Base Automation Framework
 * All automations extend this base class
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';

export interface UserAutomation {
  id: string;
  user_id: string;
  automation_id: string;
  shopify_store_url: string;
  shopify_access_token_encrypted: string | null;
  config: Record<string, any>;
  status: 'active' | 'paused' | 'error' | 'trial';
  last_run_at: string | null;
  next_run_at: string | null;
  error_message: string | null;
}

export interface ShopifyWebhookPayload {
  id: string;
  [key: string]: any;
}

export abstract class BaseAutomation {
  abstract name: string;
  abstract slug: string;

  /**
   * Called when automation is activated/installed
   */
  abstract install(userAutomationId: string): Promise<void>;

  /**
   * Called when automation is removed
   */
  abstract uninstall(userAutomationId: string): Promise<void>;

  /**
   * Handle webhook events from Shopify
   */
  abstract handleWebhook(
    topic: string,
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void>;

  /**
   * Optional: Run scheduled tasks (cron)
   */
  async runScheduled?(userAutomation: UserAutomation): Promise<void>;

  /**
   * Helper: Log execution event
   */
  protected async log(
    userAutomationId: string,
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabaseAdmin.from('automation_logs').insert({
        user_automation_id: userAutomationId,
        event_type: type,
        message,
        metadata: metadata || {},
      });

      // Track execution for monitoring (async, don't block)
      if (type === 'success' || type === 'error') {
        import('@/lib/automation-monitoring').then(({ trackAutomationExecution }) => {
          const executionTime = metadata?.execution_time_ms || 0;
          // Get automation ID from metadata or user_automation
          trackAutomationExecution(
            userAutomationId,
            metadata?.automationId || '',
            type === 'success',
            executionTime,
            type === 'error' ? message : undefined
          ).catch(err => console.error('[BaseAutomation] Failed to track execution:', err));
        });
      }
    } catch (error) {
      console.error(`[${this.name}] Failed to log:`, error);
    }
  }

  /**
   * Helper: Get Shopify client for user automation
   */
  protected async getShopifyClient(
    userAutomation: UserAutomation
  ): Promise<ShopifyClient> {
    if (!userAutomation.shopify_access_token_encrypted) {
      throw new Error('Shopify access token not found');
    }

    return ShopifyClient.fromEncryptedToken(
      userAutomation.shopify_store_url,
      userAutomation.shopify_access_token_encrypted
    );
  }

  /**
   * Helper: Update user automation status
   */
  protected async updateStatus(
    userAutomationId: string,
    status: 'active' | 'paused' | 'error' | 'trial',
    errorMessage?: string
  ): Promise<void> {
    await supabaseAdmin
      .from('user_automations')
      .update({
        status,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userAutomationId);
  }

  /**
   * Helper: Update last run time
   */
  protected async updateLastRun(userAutomationId: string): Promise<void> {
    await supabaseAdmin
      .from('user_automations')
      .update({
        last_run_at: new Date().toISOString(),
      })
      .eq('id', userAutomationId);
  }

  /**
   * Helper: Register Shopify webhook
   */
  protected async registerWebhook(
    userAutomationId: string,
    topic: string,
    webhookId: string
  ): Promise<void> {
    await supabaseAdmin.from('shopify_webhooks').upsert({
      user_automation_id: userAutomationId,
      topic,
      webhook_id: webhookId,
    });
  }

  /**
   * Helper: Unregister Shopify webhook
   */
  protected async unregisterWebhook(
    userAutomationId: string,
    topic: string
  ): Promise<void> {
    const { data: webhooks } = await supabaseAdmin
      .from('shopify_webhooks')
      .select('*')
      .eq('user_automation_id', userAutomationId)
      .eq('topic', topic);

    if (webhooks && webhooks.length > 0) {
      for (const webhook of webhooks) {
        await supabaseAdmin
          .from('shopify_webhooks')
          .delete()
          .eq('id', webhook.id);
      }
    }
  }

  /**
   * Helper: Get all webhooks for user automation
   */
  protected async getWebhooks(userAutomationId: string) {
    const { data } = await supabaseAdmin
      .from('shopify_webhooks')
      .select('*')
      .eq('user_automation_id', userAutomationId);

    return data || [];
  }

  /**
   * Helper: Render template string with variables
   */
  protected renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }
}

/**
 * Automation Registry
 * Register all automations here
 */
export const automations: Record<string, typeof BaseAutomation> = {};

/**
 * Register an automation
 */
export function registerAutomation(AutomationClass: typeof BaseAutomation): void {
  const instance = new (AutomationClass as any)();
  automations[instance.slug] = AutomationClass;
}

/**
 * Get automation instance by slug
 */
export function getAutomation(slug: string): BaseAutomation | null {
  const AutomationClass = automations[slug];
  if (!AutomationClass) {
    return null;
  }
  return new (AutomationClass as any)();
}



