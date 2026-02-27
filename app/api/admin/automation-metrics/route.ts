import { NextRequest, NextResponse } from 'next/server';
import { getAllAutomationMetrics, getCriticalErrors } from '@/lib/automation-monitoring';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/admin/automation-metrics
 * Get metrics for all automations (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication check
    // For now, allow access (add proper auth later)

    const metrics = await getAllAutomationMetrics();
    const criticalErrors = await getCriticalErrors(24); // Last 24 hours

    return NextResponse.json({
      metrics,
      criticalErrors,
      summary: {
        totalAutomations: metrics.length,
        averageSuccessRate: metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length
          : 0,
        totalErrors: criticalErrors.length,
        criticalErrors: criticalErrors.filter(e => e.severity === 'critical').length,
      },
    });
  } catch (error: any) {
    console.error('[AutomationMetrics] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

