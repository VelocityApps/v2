import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/test/database
 * Test Supabase database connection
 */
export async function GET() {
  try {
    // Check if Supabase is configured
    const supabaseConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseConfigured) {
      return NextResponse.json({
        success: false,
        error: 'Supabase not configured',
        details: 'Missing Supabase environment variables',
        configured: {
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }, { status: 500 });
    }

    // Test connection by querying a simple table
    // Try to query user_profiles or projects table (common tables)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .limit(1);

    // If user_profiles doesn't exist, try projects
    if (profilesError) {
      const { data: projects, error: projectsError } = await supabaseAdmin
        .from('projects')
        .select('id')
        .limit(1);

      if (projectsError) {
        // Try automations table (should exist based on migrations)
        const { data: automations, error: automationsError } = await supabaseAdmin
          .from('automations')
          .select('id')
          .limit(1);

        if (automationsError) {
          return NextResponse.json({
            success: false,
            error: 'Database connection failed',
            details: 'Could not query any tables. This might mean:',
            possibleIssues: [
              'Database migrations have not been run',
              'Tables do not exist',
              'RLS policies are blocking access',
            ],
            errors: {
              user_profiles: profilesError.message,
              projects: projectsError.message,
              automations: automationsError.message,
            },
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Database connection successful',
          testedTable: 'automations',
          timestamp: new Date().toISOString(),
          supabase: {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
        testedTable: 'projects',
        timestamp: new Date().toISOString(),
        supabase: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      testedTable: 'user_profiles',
      timestamp: new Date().toISOString(),
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
  } catch (error: any) {
    console.error('[TestDatabase] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test database connection',
      details: error.stack,
    }, { status: 500 });
  }
}
