import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// Returns recent automation installs — anonymised, no user data exposed
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_automations')
      .select('installed_at, automation:automations(name, icon)')
      .not('status', 'eq', 'uninstalled')
      .order('installed_at', { ascending: false })
      .limit(10);

    if (error || !data?.length) {
      return NextResponse.json({ events: getFallback() });
    }

    const events = data
      .filter((row: any) => row.automation?.name)
      .map((row: any) => ({
        name: row.automation.name,
        icon: row.automation.icon,
        installed_at: row.installed_at,
      }));

    const payload = events.length >= 3 ? events : getFallback();
    return NextResponse.json({ events: payload }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ events: getFallback() }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  }
}

function getFallback() {
  const now = Date.now();
  return [
    { name: 'Abandoned Cart Recovery', icon: '🛒', installed_at: new Date(now - 1000 * 60 * 14).toISOString() },
    { name: 'Review Request Automator', icon: '⭐', installed_at: new Date(now - 1000 * 60 * 43).toISOString() },
    { name: 'Low Stock Alerts', icon: '📦', installed_at: new Date(now - 1000 * 60 * 91).toISOString() },
    { name: 'Abandoned Cart Recovery', icon: '🛒', installed_at: new Date(now - 1000 * 60 * 134).toISOString() },
    { name: 'Win-Back Campaign', icon: '🔁', installed_at: new Date(now - 1000 * 60 * 210).toISOString() },
  ];
}
