import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/admin/users/expensive?password=ADMIN_PASSWORD
 * 
 * Lists users where cost > revenue this month
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin password
    if (!verifyAdminPassword(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get all costs this month grouped by user
    const { data: costsData } = await supabaseAdmin
      .from('costs')
      .select(`
        user_id,
        cost_usd,
        user_profiles!inner(subscription_status)
      `)
      .gte('created_at', startOfMonth.toISOString());

    // Aggregate costs by user
    const userCosts = new Map<string, { cost: number; subscription: string }>();
    costsData?.forEach((row: any) => {
      const userId = row.user_id;
      const cost = parseFloat(row.cost_usd.toString());
      const subscription = row.user_profiles?.subscription_status || 'free';

      if (userCosts.has(userId)) {
        userCosts.set(userId, {
          cost: userCosts.get(userId)!.cost + cost,
          subscription,
        });
      } else {
        userCosts.set(userId, { cost, subscription });
      }
    });

    // Calculate revenue per user based on subscription
    const subscriptionRevenue: Record<string, number> = {
      free: 0,
      pro: 29,
      teams: 99,
      cancelled: 0,
    };

    // Find users where cost > revenue
    const expensiveUsers = await Promise.all(
      Array.from(userCosts.entries())
        .map(async ([userId, data]) => {
          const revenue = subscriptionRevenue[data.subscription] || 0;
          const deficit = data.cost - revenue;

          if (deficit > 0) {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
            return {
              email: user?.user?.email || 'unknown',
              total_cost: parseFloat(data.cost.toFixed(4)),
              subscription_tier: data.subscription,
              revenue: revenue,
              deficit: parseFloat(deficit.toFixed(4)),
            };
          }
          return null;
        })
    );

    // Filter out nulls and sort by deficit descending
    const result = expensiveUsers
      .filter((user): user is NonNullable<typeof user> => user !== null)
      .sort((a, b) => b.deficit - a.deficit);

    return NextResponse.json({
      count: result.length,
      users: result,
    });
  } catch (error: any) {
    console.error('[AdminExpensiveUsers] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expensive users' },
      { status: 500 }
    );
  }
}

