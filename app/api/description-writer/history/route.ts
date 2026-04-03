import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/description-writer/history?product_id={id}
 * Returns the last 5 generations for a given product, for version history / revert.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('product_id');

  if (!productId) {
    return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
  }

  const { data: generations, error } = await supabaseAdmin
    .from('description_generations')
    .select('id, output, tone, language, created_at, input_data')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }

  return NextResponse.json({ history: generations ?? [] });
}
