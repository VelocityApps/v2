/**
 * Monitoring Library
 * 
 * Logs application events for monitoring and analytics.
 */

// Dynamically import supabase-server to avoid bundling server-only code in client
let supabaseAdmin: any = null;

async function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    // Client-side: monitoring is disabled
    return null;
  }
  
  if (!supabaseAdmin) {
    try {
      const module = await import('@/lib/supabase-server');
      supabaseAdmin = module.supabaseAdmin;
    } catch (error) {
      console.error('[Monitoring] Failed to load supabase-server:', error);
      return null;
    }
  }
  
  return supabaseAdmin;
}

export type EventType = 'signup' | 'generation' | 'upgrade' | 'error' | 'churn' | 'github_export' | 'railway_deploy' | 'vercel_deploy';

export interface EventData {
  [key: string]: any;
}

/**
 * Log an event to the monitoring_events table
 * 
 * @param type - Event type (signup, generation, upgrade, error, churn)
 * @param data - Additional event data (will be stored as JSONB)
 * @param userId - Optional user ID associated with the event
 */
export async function logEvent(
  type: EventType,
  data: EventData = {},
  userId?: string
): Promise<void> {
  try {
    const admin = await getSupabaseAdmin();
    if (!admin) {
      // Client-side or supabase not available, skip logging
      return;
    }
    
    await admin.from('monitoring_events').insert({
      event_type: type,
      user_id: userId || null,
      event_data: data,
    });
  } catch (error) {
    console.error('[Monitoring] Failed to log event:', error);
    // Don't throw - monitoring shouldn't break the application
  }
}

/**
 * Log a signup event
 */
export async function logSignup(userId: string, email: string): Promise<void> {
  await logEvent('signup', { email }, userId);
}

/**
 * Log a generation event
 */
export async function logGeneration(
  userId: string,
  data: {
    mode?: string;
    template?: string;
    prompt_length?: number;
    response_time_ms?: number;
  }
): Promise<void> {
  await logEvent('generation', data, userId);
}

/**
 * Log an upgrade event
 */
export async function logUpgrade(
  userId: string,
  data: {
    from_tier: string;
    to_tier: string;
    amount?: number;
  }
): Promise<void> {
  await logEvent('upgrade', data, userId);
}

/**
 * Log an error event
 */
export async function logError(
  error: Error | string,
  data: {
    component?: string;
    route?: string;
    userId?: string;
    stack?: string;
  } = {}
): Promise<void> {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;

  await logEvent(
    'error',
    {
      message: errorMessage,
      stack: errorStack || data.stack,
      component: data.component,
      route: data.route,
      ...data,
    },
    data.userId
  );
}

/**
 * Log a churn event (user cancellation)
 */
export async function logChurn(
  userId: string,
  data: {
    subscription_tier: string;
    reason?: string;
  }
): Promise<void> {
  await logEvent('churn', data, userId);
}

