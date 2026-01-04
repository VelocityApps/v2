/**
 * Cost Tracking Library
 * 
 * Calculates and tracks API costs for each generation.
 * Uses estimated costs per model based on typical usage.
 */

import { supabaseAdmin } from '@/lib/supabase-server';

export interface CostCalculation {
  costUsd: number;
  modelUsed: 'haiku' | 'sonnet' | 'opus';
  promptTokens?: number;
  completionTokens?: number;
}

/**
 * Calculate cost based on model used
 * These are estimates based on typical generation patterns
 */
export function calculateCost(
  mode: 'turbo' | 'forge' | 'anvil' | 'gpt',
  promptTokens?: number,
  completionTokens?: number,
  actualModel?: string
): CostCalculation {
  let modelUsed: 'haiku' | 'sonnet' | 'opus' | 'gpt-4o';
  let costUsd: number;

  // If actualModel is provided (e.g., from fallback), use that
  if (actualModel === 'gpt-4o') {
    modelUsed = 'gpt-4o';
    // GPT-4o: $0.010 per generation (same as Sonnet)
    costUsd = 0.010;
  } else {
    switch (mode) {
      case 'turbo':
        modelUsed = 'haiku';
        // Haiku (Turbo): $0.003 per generation (estimate)
        costUsd = 0.003;
        break;
      case 'forge':
        modelUsed = 'sonnet';
        // Sonnet (Forge): $0.010 per generation (estimate)
        costUsd = 0.010;
        break;
      case 'anvil':
        modelUsed = 'opus';
        // Opus (Anvil): $0.030 per generation (estimate)
        costUsd = 0.030;
        break;
      case 'gpt':
        modelUsed = 'gpt-4o';
        // GPT-4o: $0.010 per generation (same as Sonnet)
        costUsd = 0.010;
        break;
      default:
        modelUsed = 'sonnet';
        costUsd = 0.010;
    }
  }

  return {
    costUsd,
    modelUsed,
    promptTokens,
    completionTokens,
  };
}

/**
 * Log cost to database
 */
export async function logCost(
  userId: string,
  generationId: string,
  cost: CostCalculation
): Promise<void> {
  try {
    await supabaseAdmin.from('costs').insert({
      user_id: userId,
      generation_id: generationId,
      model_used: cost.modelUsed,
      prompt_tokens: cost.promptTokens || 0,
      completion_tokens: cost.completionTokens || 0,
      cost_usd: cost.costUsd,
    });
  } catch (error) {
    console.error('[CostTracking] Failed to log cost:', error);
    // Don't throw - cost tracking shouldn't break generation
  }
}

/**
 * Check user's total costs this month
 */
export async function getUserMonthlyCost(userId: string): Promise<number> {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from('costs')
      .select('cost_usd')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      console.error('[CostTracking] Error fetching monthly cost:', error);
      return 0;
    }

    return data.reduce((sum, row) => sum + parseFloat(row.cost_usd.toString()), 0);
  } catch (error) {
    console.error('[CostTracking] Error calculating monthly cost:', error);
    return 0;
  }
}

/**
 * Check if user should be rate limited due to high costs
 * Returns true if user's monthly cost > $30
 */
export async function shouldRateLimitByCost(userId: string): Promise<boolean> {
  const monthlyCost = await getUserMonthlyCost(userId);
  return monthlyCost > 30;
}

/**
 * Get cost warning level
 * Returns 'none' | 'warning' | 'rate_limit'
 */
export async function getCostWarningLevel(userId: string): Promise<'none' | 'warning' | 'rate_limit'> {
  const monthlyCost = await getUserMonthlyCost(userId);
  
  if (monthlyCost > 30) {
    return 'rate_limit';
  } else if (monthlyCost > 25) {
    return 'warning';
  }
  
  return 'none';
}

