/**
 * Automation-specific monitoring and tracking
 * Tracks automation success rates, conversion rates, and errors
 */

import { supabaseAdmin } from './supabase-server';
import { logError } from './monitoring';
import { sendAlertEmail } from './email';

export interface AutomationMetrics {
  automationId: string;
  automationSlug: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  averageExecutionTime: number;
  lastRunAt: Date | null;
  conversionRate?: number; // For automations that have conversions (e.g., review requests)
}

export interface AutomationError {
  automationId: string;
  userAutomationId: string;
  error: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

/**
 * Track automation execution
 */
export async function trackAutomationExecution(
  userAutomationId: string,
  automationId: string,
  success: boolean,
  executionTimeMs: number,
  error?: string
): Promise<void> {
  try {
    // Log to automation_logs (already exists)
    await supabaseAdmin.from('automation_logs').insert({
      user_automation_id: userAutomationId,
      event_type: success ? 'success' : 'error',
      message: success ? 'Automation executed successfully' : (error || 'Automation execution failed'),
      metadata: {
        execution_time_ms: executionTimeMs,
        timestamp: new Date().toISOString(),
      },
    });

    // If error, also log to monitoring_events for alerting
    if (!success && error) {
      await logError(error, {
        component: 'automation',
        route: `/dashboard/automations/${userAutomationId}`,
      });
      // Determine severity and send alert for high/critical
      const severity = determineSeverity(error);
      if (severity === 'high' || severity === 'critical') {
        const subject = `[${severity.toUpperCase()}] Automation Error - ${automationId}`;
        const html = `
          <h3>Automation Error (${severity})</h3>
          <p><strong>Automation ID:</strong> ${automationId}</p>
          <p><strong>User Automation ID:</strong> ${userAutomationId}</p>
          <p><strong>Error:</strong> ${error}</p>
          <p><strong>Execution Time:</strong> ${executionTimeMs} ms</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `;
        await sendAlertEmail(subject, html, `Automation ${automationId} failed: ${error}`);
      }
    }
  } catch (err) {
    console.error('[AutomationMonitoring] Failed to track execution:', err);
    // Don't throw - monitoring shouldn't break automations
  }
}

/**
 * Track automation conversion (e.g., review request → review received)
 */
export async function trackAutomationConversion(
  userAutomationId: string,
  automationId: string,
  conversionType: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabaseAdmin.from('automation_logs').insert({
      user_automation_id: userAutomationId,
      event_type: 'success',
      message: `Conversion: ${conversionType}`,
      metadata: {
        conversion_type: conversionType,
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[AutomationMonitoring] Failed to track conversion:', err);
  }
}

/**
 * Get automation metrics
 */
export async function getAutomationMetrics(automationId: string): Promise<AutomationMetrics | null> {
  try {
    // Get all user automations for this automation
    const { data: userAutomations } = await supabaseAdmin
      .from('user_automations')
      .select('id')
      .eq('automation_id', automationId)
      .eq('status', 'active');

    if (!userAutomations || userAutomations.length === 0) {
      return null;
    }

    const userAutomationIds = userAutomations.map(ua => ua.id);

    // Get logs for these automations
    const { data: logs } = await supabaseAdmin
      .from('automation_logs')
      .select('*')
      .in('user_automation_id', userAutomationIds)
      .order('created_at', { ascending: false });

    if (!logs) {
      return null;
    }

    const totalRuns = logs.length;
    const successfulRuns = logs.filter(l => l.event_type === 'success').length;
    const failedRuns = logs.filter(l => l.event_type === 'error').length;
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

    // Calculate average execution time
    const executionTimes = logs
      .map(l => l.metadata?.execution_time_ms)
      .filter(t => typeof t === 'number') as number[];
    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

    // Get last run
    const lastRun = logs[0]?.created_at ? new Date(logs[0].created_at) : null;

    // Get automation details
    const { data: automation } = await supabaseAdmin
      .from('automations')
      .select('slug')
      .eq('id', automationId)
      .single();

    // Calculate conversion rate (for review requests, etc.)
    let conversionRate: number | undefined;
    const conversionLogs = logs.filter(l => 
      l.metadata?.conversion_type && l.event_type === 'success'
    );
    if (conversionLogs.length > 0) {
      // This is a simplified calculation - adjust based on your needs
      conversionRate = (conversionLogs.length / successfulRuns) * 100;
    }

    return {
      automationId,
      automationSlug: automation?.slug || '',
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate,
      averageExecutionTime,
      lastRunAt: lastRun,
      conversionRate,
    };
  } catch (err) {
    console.error('[AutomationMonitoring] Failed to get metrics:', err);
    return null;
  }
}

/**
 * Get all automation metrics (for dashboard)
 */
export async function getAllAutomationMetrics(): Promise<AutomationMetrics[]> {
  try {
    const { data: automations } = await supabaseAdmin
      .from('automations')
      .select('id, slug')
      .eq('active', true);

    if (!automations) {
      return [];
    }

    const metrics = await Promise.all(
      automations.map(auto => getAutomationMetrics(auto.id))
    );

    return metrics.filter((m): m is AutomationMetrics => m !== null);
  } catch (err) {
    console.error('[AutomationMonitoring] Failed to get all metrics:', err);
    return [];
  }
}

/**
 * Check for automation errors that need attention
 */
export async function getCriticalErrors(hours: number = 24): Promise<AutomationError[]> {
  try {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { data: logs } = await supabaseAdmin
      .from('automation_logs')
      .select(`
        *,
        user_automation:user_automations!inner(
          id,
          automation_id,
          automation:automations(id, slug)
        )
      `)
      .eq('event_type', 'error')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (!logs) {
      return [];
    }

    return logs.map(log => ({
      automationId: log.user_automation.automation.id,
      userAutomationId: log.user_automation_id,
      error: log.message,
      timestamp: new Date(log.created_at),
      severity: determineSeverity(log.message),
      resolved: false,
    }));
  } catch (err) {
    console.error('[AutomationMonitoring] Failed to get critical errors:', err);
    return [];
  }
}

/**
 * Determine error severity based on error message
 */
function determineSeverity(errorMessage: string): 'low' | 'medium' | 'high' | 'critical' {
  const message = errorMessage.toLowerCase();
  
  if (message.includes('store') && (message.includes('break') || message.includes('down'))) {
    return 'critical';
  }
  if (message.includes('token') || message.includes('auth') || message.includes('permission')) {
    return 'high';
  }
  if (message.includes('timeout') || message.includes('rate limit')) {
    return 'medium';
  }
  return 'low';
}

/**
 * Update automation success rate in automations table
 */
export async function updateAutomationSuccessRate(automationId: string): Promise<void> {
  try {
    const metrics = await getAutomationMetrics(automationId);
    if (!metrics) return;

    // Store success rate in automations table (we can add a column for this)
    // For now, we'll calculate it on the fly
  } catch (err) {
    console.error('[AutomationMonitoring] Failed to update success rate:', err);
  }
}

