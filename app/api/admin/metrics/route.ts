import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/admin/metrics?password=ADMIN_PASSWORD
 * 
 * Returns comprehensive metrics for admin dashboard
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
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get costs for different periods
    const { data: costsToday } = await supabaseAdmin
      .from('costs')
      .select('cost_usd')
      .gte('created_at', startOfToday.toISOString());

    const { data: costsThisWeek } = await supabaseAdmin
      .from('costs')
      .select('cost_usd')
      .gte('created_at', startOfWeek.toISOString());

    const { data: costsThisMonth } = await supabaseAdmin
      .from('costs')
      .select('cost_usd')
      .gte('created_at', startOfMonth.toISOString());

    // Get generation counts
    const generationsToday = costsToday?.length || 0;
    const generationsThisWeek = costsThisWeek?.length || 0;
    const generationsThisMonth = costsThisMonth?.length || 0;

    // Calculate costs
    const costToday = costsToday?.reduce((sum, row) => sum + parseFloat(row.cost_usd.toString()), 0) || 0;
    const costThisWeek = costsThisWeek?.reduce((sum, row) => sum + parseFloat(row.cost_usd.toString()), 0) || 0;
    const costThisMonth = costsThisMonth?.reduce((sum, row) => sum + parseFloat(row.cost_usd.toString()), 0) || 0;

    // Get user counts
    const { count: totalUsers } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    // Get subscription counts for revenue calculation
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('subscription_status');

    const proUsers = profiles?.filter(p => p.subscription_status === 'pro').length || 0;
    const teamsUsers = profiles?.filter(p => p.subscription_status === 'teams').length || 0;

    // Calculate revenue (simplified - assumes all subscriptions are active)
    const revenueToday = 0; // Daily revenue would need subscription billing data
    const revenueThisWeek = (proUsers * 29 + teamsUsers * 99) / 4.33; // Approximate weekly
    const revenueThisMonth = proUsers * 29 + teamsUsers * 99;

    // Get top spenders this month
    const { data: topSpendersData } = await supabaseAdmin
      .from('costs')
      .select(`
        user_id,
        cost_usd,
        user_profiles!inner(subscription_status)
      `)
      .gte('created_at', startOfMonth.toISOString());

    // Aggregate by user
    const userCosts = new Map<string, { cost: number; subscription: string }>();
    topSpendersData?.forEach((row: any) => {
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

    // Get user emails for top spenders
    const topSpenders = await Promise.all(
      Array.from(userCosts.entries())
        .sort((a, b) => b[1].cost - a[1].cost)
        .slice(0, 10)
        .map(async ([userId, data]) => {
          const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
          return {
            user_id: userId,
            email: user?.user?.email || 'unknown',
            total_cost: data.cost,
            subscription_tier: data.subscription,
            total_credits_used: 0, // Would need to calculate from generations
          };
        })
    );

    // Calculate profit per user
    const avgRevenue = revenueThisMonth / (totalUsers || 1);
    const avgCost = costThisMonth / (totalUsers || 1);
    const avgProfit = avgRevenue - avgCost;

    // Get today's signups from monitoring_events
    const { count: signupsToday } = await supabaseAdmin
      .from('monitoring_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'signup')
      .gte('created_at', startOfToday.toISOString());

    // Calculate Current MRR (Monthly Recurring Revenue)
    const currentMRR = proUsers * 29 + teamsUsers * 99;

    // Calculate churn rate (last 30 days)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const { count: churnedUsers } = await supabaseAdmin
      .from('monitoring_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'churn')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get total users 30 days ago (approximate)
    const { count: users30DaysAgo } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .lte('created_at', thirtyDaysAgo.toISOString());

    const churnRate = users30DaysAgo && users30DaysAgo > 0
      ? parseFloat(((churnedUsers || 0) / users30DaysAgo * 100).toFixed(2))
      : 0;

    // Calculate average credits per user
    const { data: allProfiles } = await supabaseAdmin
      .from('user_profiles')
      .select('credits_remaining');

    const totalCredits = allProfiles?.reduce((sum, p) => sum + parseFloat(p.credits_remaining?.toString() || '0'), 0) || 0;
    const avgCreditsPerUser = totalUsers && totalUsers > 0
      ? parseFloat((totalCredits / totalUsers).toFixed(2))
      : 0;

    // Get most used templates from monitoring_events
    const { data: generationEvents } = await supabaseAdmin
      .from('monitoring_events')
      .select('event_data')
      .eq('event_type', 'generation')
      .gte('created_at', startOfMonth.toISOString());

    const templateUsage = new Map<string, number>();
    generationEvents?.forEach((event: any) => {
      const template = event.event_data?.template || 'custom';
      templateUsage.set(template, (templateUsage.get(template) || 0) + 1);
    });

    const mostUsedTemplates = Array.from(templateUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([template, count]) => ({
        template,
        count,
      }));

    return NextResponse.json({
      today: {
        signups: signupsToday || 0,
        generations: generationsToday,
        revenue: parseFloat(revenueToday.toFixed(2)),
        cost: parseFloat(costToday.toFixed(2)),
        profit: parseFloat((revenueToday - costToday).toFixed(2)),
      },
      thisWeek: {
        generations: generationsThisWeek,
        cost: parseFloat(costThisWeek.toFixed(2)),
        revenue: parseFloat(revenueThisWeek.toFixed(2)),
        profit: parseFloat((revenueThisWeek - costThisWeek).toFixed(2)),
      },
      thisMonth: {
        generations: generationsThisMonth,
        cost: parseFloat(costThisMonth.toFixed(2)),
        revenue: parseFloat(revenueThisMonth.toFixed(2)),
        profit: parseFloat((revenueThisMonth - costThisMonth).toFixed(2)),
      },
      currentMRR: parseFloat(currentMRR.toFixed(2)),
      churnRate: churnRate,
      averageCreditsPerUser: avgCreditsPerUser,
      mostUsedTemplates: mostUsedTemplates,
      topSpenders,
      profitPerUser: {
        avg_revenue: parseFloat(avgRevenue.toFixed(2)),
        avg_cost: parseFloat(avgCost.toFixed(2)),
        avg_profit: parseFloat(avgProfit.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error('[AdminMetrics] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

