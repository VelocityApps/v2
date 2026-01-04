import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/user/preferences
 * Get user preferences
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create preferences
    let { data: preferences, error } = await supabaseAdmin
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No preferences found, create default
      const { data: newPreferences, error: createError } = await supabaseAdmin
        .from('user_preferences')
        .insert({
          user_id: user.id,
          shopify_view_mode: 'merchant',
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      preferences = newPreferences;
    } else if (error) {
      throw error;
    }

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('[Preferences] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/preferences
 * Create or update user preferences
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shopify_view_mode } = await request.json();

    if (!shopify_view_mode || !['merchant', 'developer'].includes(shopify_view_mode)) {
      return NextResponse.json(
        { error: 'Invalid shopify_view_mode. Must be "merchant" or "developer"' },
        { status: 400 }
      );
    }

    // Upsert preferences
    const { data: preferences, error } = await supabaseAdmin
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        shopify_view_mode,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('[Preferences] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save preferences' },
      { status: 500 }
    );
  }
}

