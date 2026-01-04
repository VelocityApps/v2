import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DataSourceConnector, DataSourceType, DataSourceConfig } from '@/lib/data-source-connectors';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/data-sources
 * Get all data sources for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching data sources:', error);
      return NextResponse.json({ error: 'Failed to fetch data sources' }, { status: 500 });
    }

    // Remove sensitive data from config before sending
    const sanitized = data.map((source: any) => ({
      ...source,
      config: this.sanitizeConfig(source.config, source.type),
    }));

    return NextResponse.json({ data: sanitized });
  } catch (error: any) {
    console.error('Error in GET /api/data-sources:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  function sanitizeConfig(config: any, type: DataSourceType): any {
    const sanitized = { ...config };
    
    // Remove sensitive keys but keep structure
    if (sanitized.apiKey) sanitized.apiKey = '***';
    if (sanitized.password) sanitized.password = '***';
    if (sanitized.notionApiKey) sanitized.notionApiKey = '***';
    if (sanitized.airtableApiKey) sanitized.airtableApiKey = '***';
    if (sanitized.supabaseKey) sanitized.supabaseKey = '***';
    
    return sanitized;
  }
}

/**
 * POST /api/data-sources
 * Create a new data source
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, config, project_id } = body;

    if (!name || !type || !config) {
      return NextResponse.json(
        { error: 'Name, type, and config are required' },
        { status: 400 }
      );
    }

    // Test the connection first
    const connector = new DataSourceConnector(type as DataSourceType, config);
    const testResult = await connector.testConnection();

    if (!testResult.success) {
      return NextResponse.json(
        { error: `Connection test failed: ${testResult.error}` },
        { status: 400 }
      );
    }

    // Detect schema
    const schema = await connector.detectSchema();

    // Create the data source
    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .insert({
        user_id: user.id,
        name,
        type,
        config,
        schema: schema || {},
        project_id: project_id || null,
        last_tested_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating data source:', error);
      return NextResponse.json({ error: 'Failed to create data source' }, { status: 500 });
    }

    // Sanitize config before returning
    const sanitized = {
      ...data,
      config: sanitizeConfig(data.config, type),
    };

    return NextResponse.json({ data: sanitized }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/data-sources:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  function sanitizeConfig(config: any, type: DataSourceType): any {
    const sanitized = { ...config };
    if (sanitized.apiKey) sanitized.apiKey = '***';
    if (sanitized.password) sanitized.password = '***';
    if (sanitized.notionApiKey) sanitized.notionApiKey = '***';
    if (sanitized.airtableApiKey) sanitized.airtableApiKey = '***';
    if (sanitized.supabaseKey) sanitized.supabaseKey = '***';
    return sanitized;
  }
}


