import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Get user profile
    let { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Check if table doesn't exist
    if (profileError && profileError.code === '42P01') {
      return NextResponse.json(
        { 
          error: 'Database tables not set up. Please run the SQL migration in Supabase Dashboard → SQL Editor.',
          code: 'MISSING_TABLES'
        },
        { status: 500 }
      );
    }

    // Create profile if it doesn't exist
    if (!profile && !profileError) {
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          subscription_status: 'free',
          credits_remaining: 10.0,
          credits_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }
      profile = newProfile;
    }

    // Check if credits need to be reset
    const resetDate = new Date(profile.credits_reset_date);
    const now = new Date();
    
    if (resetDate <= now) {
      const newCredits = profile.subscription_status === 'pro' ? 500.0 : 10.0;
      const newResetDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data: updatedProfile } = await supabase
        .from('user_profiles')
        .update({
          credits_remaining: newCredits,
          credits_reset_date: newResetDate.toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      profile = updatedProfile || profile;
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const { credits_remaining } = await request.json();

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ credits_remaining })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ profile: data });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

