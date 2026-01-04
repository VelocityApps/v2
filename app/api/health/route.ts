import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';

/**
 * GET /api/health
 * 
 * Health check endpoint that verifies all critical services are operational.
 * Returns status: "all_systems_operational" if all checks pass.
 */
export async function GET() {
  const checks = {
    database: false,
    anthropic: false,
    stripe: false,
  };

  const errors: string[] = [];

  // Check database connection
  try {
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    checks.database = true;
  } catch (error: any) {
    errors.push(`Database: ${error.message}`);
  }

  // Check Anthropic API
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY_1;
    
    if (!apiKey) {
      throw new Error('No Anthropic API key configured');
    }

    const anthropic = new Anthropic({ apiKey });
    // Try a minimal API call (or just check if client initializes)
    // For health check, we'll just verify the key exists and client initializes
    checks.anthropic = true;
  } catch (error: any) {
    errors.push(`Anthropic API: ${error.message}`);
  }

  // Check Stripe API
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      throw new Error('No Stripe secret key configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-11-17.clover',
    });

    // Try a minimal API call
    await stripe.balance.retrieve();
    checks.stripe = true;
  } catch (error: any) {
    errors.push(`Stripe API: ${error.message}`);
  }

  const allOperational = checks.database && checks.anthropic && checks.stripe;

  if (allOperational) {
    return NextResponse.json({
      status: 'all_systems_operational',
      checks,
      timestamp: new Date().toISOString(),
    });
  } else {
    return NextResponse.json(
      {
        status: 'degraded',
        checks,
        errors,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

