import { NextRequest, NextResponse } from 'next/server';
import { getAutomationMetrics } from '@/lib/automation-monitoring';

/**
 * GET /api/automations/[id]/metrics
 * Get public metrics for a specific automation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const metrics = await getAutomationMetrics(params.id);

    if (!metrics) {
      return NextResponse.json(
        { error: 'Automation not found or no metrics available' },
        { status: 404 }
      );
    }

    // Return public metrics only (no sensitive data)
    return NextResponse.json({
      automationId: metrics.automationId,
      automationSlug: metrics.automationSlug,
      successRate: Math.round(metrics.successRate * 10) / 10, // Round to 1 decimal
      totalRuns: metrics.totalRuns,
      conversionRate: metrics.conversionRate 
        ? Math.round(metrics.conversionRate * 10) / 10 
        : undefined,
      // Don't expose failed runs, errors, or user-specific data
    });
  } catch (error: any) {
    console.error('[AutomationMetrics] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

