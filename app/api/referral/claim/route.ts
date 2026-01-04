import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * POST /api/referral/claim
 * Body: { ref: string } where ref is the referrer's user_id
 *
 * Logic:
 * - Authenticated user sends ref code (referrer user_id)
 * - If user already has a referrer, do nothing
 * - Otherwise:
 *   - Set referrer_id on current user's profile
 *   - Give both users +50 credits
 *   - Increment referrer's referral_count
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { ref } = await request.json();

    if (!ref) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users cannot refer themselves
    if (ref === user.id) {
      return NextResponse.json({ error: 'You cannot refer yourself' }, { status: 400 });
    }

    // Load current user's profile
    const { data: currentProfile, error: currentProfileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (currentProfileError) {
      return NextResponse.json({ error: 'Failed to load user profile' }, { status: 500 });
    }

    // If user already has a referrer, do nothing (idempotent)
    if (currentProfile.referrer_id) {
      return NextResponse.json({ message: 'Referral already applied' });
    }

    // Load referrer profile
    const { data: referrerProfile, error: referrerError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', ref)
      .single();

    if (referrerError || !referrerProfile) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }

    const bonus = 50.0;

    // Update current user's profile: set referrer_id and add credits
    const { error: updateCurrentError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        referrer_id: ref,
        credits_remaining: (currentProfile.credits_remaining || 0) + bonus,
      })
      .eq('user_id', user.id);

    if (updateCurrentError) {
      return NextResponse.json({ error: 'Failed to apply referral bonus' }, { status: 500 });
    }

    // Update referrer's profile: add credits and increment referral_count
    const { error: updateReferrerError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        credits_remaining: (referrerProfile.credits_remaining || 0) + bonus,
        referral_count: (referrerProfile.referral_count || 0) + 1,
      })
      .eq('user_id', ref);

    if (updateReferrerError) {
      return NextResponse.json({ error: 'Failed to update referrer profile' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Referral applied. Both users received 50 extra credits.' });
  } catch (error: any) {
    console.error('Error applying referral:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply referral' },
      { status: 500 }
    );
  }
}


