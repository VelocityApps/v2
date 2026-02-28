import { NextRequest, NextResponse } from 'next/server';
import { getCriticalErrors } from '@/lib/automation-monitoring';
import { verifyAdminPassword } from '@/lib/admin-auth';

/**
 * GET /api/admin/error-alerts?password=ADMIN_PASSWORD
 * Get critical errors that need attention (for monitoring/alerts)
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminPassword(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hours = parseInt(request.nextUrl.searchParams.get('hours') || '24');
    
    const criticalErrors = await getCriticalErrors(hours);
    
    // Filter by severity
    const critical = criticalErrors.filter(e => e.severity === 'critical');
    const high = criticalErrors.filter(e => e.severity === 'high');
    
    return NextResponse.json({
      total: criticalErrors.length,
      critical: critical.length,
      high: high.length,
      errors: criticalErrors,
      alerts: {
        needsImmediateAttention: critical.length > 0,
        needsAttention: high.length > 5,
        errorRate: criticalErrors.length,
      },
    });
  } catch (error: any) {
    console.error('[ErrorAlerts] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch error alerts' },
      { status: 500 }
    );
  }
}

