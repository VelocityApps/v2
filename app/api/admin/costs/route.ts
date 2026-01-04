import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/admin/costs?password=ADMIN_PASSWORD
 * 
 * Returns comprehensive cost analysis for admin dashboard
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

    // Get all costs
    const { data: allCosts, error: costsError } = await supabaseAdmin
      .from('costs')
      .select('*')
      .order('created_at', { ascending: false });

    if (costsError) {
      throw new Error(`Failed to fetch costs: ${costsError.message}`);
    }

    // Type assertion for costs data
    type CostRow = {
      id: string;
      user_id: string;
      generation_id: string;
      model_used: string;
      prompt_tokens: number;
      completion_tokens: number;
      cost_usd: number | string;
      created_at: string;
    };

    const costs = (allCosts || []) as CostRow[];

    // Filter costs by period
    const costsToday = costs.filter(c => new Date(c.created_at) >= startOfToday);
    const costsThisWeek = costs.filter(c => new Date(c.created_at) >= startOfWeek);
    const costsThisMonth = costs.filter(c => new Date(c.created_at) >= startOfMonth);

    // Calculate totals
    const totalCostToday = costsToday.reduce((sum, c) => sum + parseFloat(String(c.cost_usd)), 0);
    const totalCostThisWeek = costsThisWeek.reduce((sum, c) => sum + parseFloat(String(c.cost_usd)), 0);
    const totalCostThisMonth = costsThisMonth.reduce((sum, c) => sum + parseFloat(String(c.cost_usd)), 0);

    // Get user profiles for revenue calculation
    type UserProfile = {
      user_id: string;
      subscription_status: string;
    };
    
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, subscription_status');
    
    const userProfiles = (profiles || []) as UserProfile[];

    // Calculate revenue
    const proUsers = userProfiles.filter(p => p.subscription_status === 'pro').length;
    const teamsUsers = userProfiles.filter(p => p.subscription_status === 'teams').length;
    const revenueThisMonth = proUsers * 29 + teamsUsers * 99;

    // Aggregate costs per user
    const userCosts = new Map<string, {
      userId: string;
      totalCost: number;
      generations: number;
      subscriptionStatus: string;
    }>();

    costsThisMonth.forEach((cost: CostRow) => {
      const userId = cost.user_id;
      const costAmount = parseFloat(cost.cost_usd.toString());

      if (userCosts.has(userId)) {
        const existing = userCosts.get(userId)!;
        existing.totalCost += costAmount;
        existing.generations += 1;
      } else {
        const profile = userProfiles.find(p => p.user_id === userId);
        userCosts.set(userId, {
          userId,
          totalCost: costAmount,
          generations: 1,
          subscriptionStatus: profile?.subscription_status || 'free',
        });
      }
    });

    // Get user emails and calculate profit/loss
    const costPerUser = await Promise.all(
      Array.from(userCosts.entries())
        .map(async ([userId, data]) => {
          const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
          
          // Calculate revenue for this user
          let userRevenue = 0;
          if (data.subscriptionStatus === 'pro') {
            userRevenue = 29;
          } else if (data.subscriptionStatus === 'teams') {
            userRevenue = 99;
          }

          const profitLoss = userRevenue - data.totalCost;

          return {
            user_id: userId,
            email: user?.user?.email || 'unknown',
            total_cost: parseFloat(data.totalCost.toFixed(4)),
            generations: data.generations,
            subscription_status: data.subscriptionStatus,
            revenue: userRevenue,
            profit_loss: parseFloat(profitLoss.toFixed(4)),
          };
        })
    );

    // Sort by cost descending
    costPerUser.sort((a, b) => b.total_cost - a.total_cost);

    // Get most expensive users (top 10)
    const mostExpensiveUsers = costPerUser.slice(0, 10);

    // Calculate profit/loss per user averages
    const totalProfitLoss = costPerUser.reduce((sum, u) => sum + u.profit_loss, 0);
    const avgProfitLossPerUser = costPerUser.length > 0 
      ? parseFloat((totalProfitLoss / costPerUser.length).toFixed(4))
      : 0;

    return NextResponse.json({
      totals: {
        today: {
          cost: parseFloat(totalCostToday.toFixed(4)),
          generations: costsToday.length,
        },
        thisWeek: {
          cost: parseFloat(totalCostThisWeek.toFixed(4)),
          generations: costsThisWeek.length,
        },
        thisMonth: {
          cost: parseFloat(totalCostThisMonth.toFixed(4)),
          generations: costsThisMonth.length,
          revenue: revenueThisMonth,
          profit_loss: parseFloat((revenueThisMonth - totalCostThisMonth).toFixed(4)),
        },
      },
      costPerUser: costPerUser,
      mostExpensiveUsers: mostExpensiveUsers,
      averages: {
        avg_cost_per_user: costPerUser.length > 0
          ? parseFloat((totalCostThisMonth / costPerUser.length).toFixed(4))
          : 0,
        avg_profit_loss_per_user: avgProfitLossPerUser,
      },
    });
  } catch (error: any) {
    console.error('[AdminCosts] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cost data' },
      { status: 500 }
    );
  }
}

