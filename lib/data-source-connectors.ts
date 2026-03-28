/**
 * Data Source Connectors
 * Handles connections to various data sources (REST APIs, Notion, Airtable, databases)
 */

export type DataSourceType = 'rest_api' | 'notion' | 'airtable' | 'database' | 'supabase' | 'postgres' | 'mysql' | 'mongodb';

export interface DataSourceConfig {
  // REST API
  baseUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  authType?: 'bearer' | 'basic' | 'api_key' | 'none';
  
  // Notion
  notionApiKey?: string;
  notionDatabaseId?: string;
  
  // Airtable
  airtableApiKey?: string;
  airtableBaseId?: string;
  airtableTableId?: string;
  
  // Database
  databaseUrl?: string;
  databaseName?: string;
  username?: string;
  password?: string;
  host?: string;
  port?: number;
  
  // Supabase
  supabaseUrl?: string;
  supabaseKey?: string;
  supabaseTable?: string;
}

export interface SchemaField {
  name: string;
  type: string;
  nullable?: boolean;
  description?: string;
}

export interface DataSourceSchema {
  fields: SchemaField[];
  sampleData?: any[];
  endpoint?: string;
  table?: string;
}

/**
 * Reject URLs that point to private/internal networks to prevent SSRF.
 * Blocks loopback, link-local, private RFC-1918, and non-https schemes.
 */
function assertSafeUrl(raw: string): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  const hostname = url.hostname.toLowerCase();

  // Block loopback
  if (hostname === 'localhost' || hostname === '::1') {
    throw new Error('URL targets a disallowed host');
  }

  // Block by dotted-decimal IPv4
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b, c, d] = ipv4.map(Number);
    if (
      a === 10 ||                                      // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) ||            // 172.16.0.0/12
      (a === 192 && b === 168) ||                     // 192.168.0.0/16
      (a === 169 && b === 254) ||                     // 169.254.0.0/16 link-local
      a === 127 ||                                    // 127.0.0.0/8 loopback
      a === 0 ||                                      // 0.0.0.0/8
      (a === 100 && b >= 64 && b <= 127) ||           // 100.64.0.0/10 shared address
      a === 192 && b === 0 && c === 2 ||              // TEST-NET-1
      (a === 198 && b >= 18 && b <= 19) ||            // 198.18.0.0/15 benchmark
      (a === 203 && b === 0 && c === 113) ||          // TEST-NET-3
      a >= 224                                        // multicast / reserved
    ) {
      throw new Error('URL targets a disallowed host');
    }
  }

  // Block metadata endpoints by hostname pattern
  if (
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal' ||
    hostname === '169.254.169.254'
  ) {
    throw new Error('URL targets a disallowed host');
  }
}

export class DataSourceConnector {
  constructor(private type: DataSourceType, private config: DataSourceConfig) {}

  /**
   * Test the connection to the data source
   */
  async testConnection(): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      switch (this.type) {
        case 'rest_api':
          return await this.testRestAPI();
        case 'notion':
          return await this.testNotion();
        case 'airtable':
          return await this.testAirtable();
        case 'supabase':
          return await this.testSupabase();
        default:
          return { success: false, error: `Unsupported data source type: ${this.type}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Connection test failed' };
    }
  }

  /**
   * Fetch data from the source
   */
  async fetchData(limit: number = 10): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      switch (this.type) {
        case 'rest_api':
          return await this.fetchFromRestAPI(limit);
        case 'notion':
          return await this.fetchFromNotion(limit);
        case 'airtable':
          return await this.fetchFromAirtable(limit);
        case 'supabase':
          return await this.fetchFromSupabase(limit);
        default:
          return { success: false, error: `Unsupported data source type: ${this.type}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch data' };
    }
  }

  /**
   * Detect schema from sample data
   */
  async detectSchema(): Promise<DataSourceSchema | null> {
    const result = await this.fetchData(5);
    if (!result.success || !result.data || result.data.length === 0) {
      return null;
    }

    const sample = result.data[0];
    const fields: SchemaField[] = [];

    if (typeof sample === 'object' && sample !== null) {
      for (const [key, value] of Object.entries(sample)) {
        fields.push({
          name: key,
          type: this.inferType(value),
          nullable: value === null || value === undefined,
        });
      }
    }

    return {
      fields,
      sampleData: result.data.slice(0, 3),
    };
  }

  private inferType(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') {
      // Check if it's a date
      if (/^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(Date.parse(value))) return 'date';
      return 'string';
    }
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  // REST API Methods
  private async testRestAPI(): Promise<{ success: boolean; error?: string; data?: any }> {
    if (!this.config.baseUrl) {
      return { success: false, error: 'Base URL is required' };
    }

    try {
      assertSafeUrl(this.config.baseUrl);
    } catch (e: any) {
      return { success: false, error: e.message };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    // Add authentication
    if (this.config.authType === 'bearer' && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else if (this.config.authType === 'basic' && this.config.apiKey) {
      headers['Authorization'] = `Basic ${Buffer.from(this.config.apiKey).toString('base64')}`;
    } else if (this.config.authType === 'api_key' && this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async fetchFromRestAPI(limit: number): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const testResult = await this.testRestAPI();
    if (!testResult.success) {
      return { success: false, error: testResult.error };
    }

    // If the response is an array, return it
    if (Array.isArray(testResult.data)) {
      return { success: true, data: testResult.data.slice(0, limit) };
    }

    // If it's an object, try to find an array property
    if (typeof testResult.data === 'object' && testResult.data !== null) {
      for (const value of Object.values(testResult.data)) {
        if (Array.isArray(value)) {
          return { success: true, data: (value as any[]).slice(0, limit) };
        }
      }
    }

    return { success: true, data: [testResult.data] };
  }

  // Notion Methods
  private async testNotion(): Promise<{ success: boolean; error?: string; data?: any }> {
    if (!this.config.notionApiKey) {
      return { success: false, error: 'Notion API key is required' };
    }

    try {
      const url = this.config.notionDatabaseId
        ? `https://api.notion.com/v1/databases/${this.config.notionDatabaseId}`
        : 'https://api.notion.com/v1/users/me';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.notionApiKey}`,
          'Notion-Version': '2022-06-28',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Notion API error: ${response.status} - ${error}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async fetchFromNotion(limit: number): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!this.config.notionDatabaseId || !this.config.notionApiKey) {
      return { success: false, error: 'Notion database ID and API key are required' };
    }

    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${this.config.notionDatabaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.notionApiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page_size: limit }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Notion API error: ${response.status}` };
      }

      const data = await response.json();
      const results = data.results || [];

      // Transform Notion pages to simple objects
      const transformed = results.map((page: any) => {
        const obj: any = { id: page.id };
        if (page.properties) {
          for (const [key, prop] of Object.entries(page.properties as any)) {
            obj[key] = this.extractNotionProperty(prop);
          }
        }
        return obj;
      });

      return { success: true, data: transformed };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private extractNotionProperty(prop: any): any {
    const type = prop.type;
    switch (type) {
      case 'title':
        return prop.title?.[0]?.plain_text || '';
      case 'rich_text':
        return prop.rich_text?.[0]?.plain_text || '';
      case 'number':
        return prop.number;
      case 'select':
        return prop.select?.name;
      case 'multi_select':
        return prop.multi_select?.map((s: any) => s.name) || [];
      case 'date':
        return prop.date?.start;
      case 'checkbox':
        return prop.checkbox;
      case 'url':
        return prop.url;
      case 'email':
        return prop.email;
      default:
        return null;
    }
  }

  // Airtable Methods
  private async testAirtable(): Promise<{ success: boolean; error?: string; data?: any }> {
    if (!this.config.airtableApiKey || !this.config.airtableBaseId) {
      return { success: false, error: 'Airtable API key and Base ID are required' };
    }

    try {
      const url = this.config.airtableTableId
        ? `https://api.airtable.com/v0/${this.config.airtableBaseId}/${this.config.airtableTableId}?maxRecords=1`
        : `https://api.airtable.com/v0/meta/bases/${this.config.airtableBaseId}/tables`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.airtableApiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Airtable API error: ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async fetchFromAirtable(limit: number): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!this.config.airtableBaseId || !this.config.airtableTableId || !this.config.airtableApiKey) {
      return { success: false, error: 'Airtable Base ID, Table ID, and API key are required' };
    }

    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${this.config.airtableBaseId}/${this.config.airtableTableId}?maxRecords=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.airtableApiKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Airtable API error: ${response.status}` };
      }

      const data = await response.json();
      const records = data.records || [];

      // Transform Airtable records to simple objects
      const transformed = records.map((record: any) => ({
        id: record.id,
        ...record.fields,
      }));

      return { success: true, data: transformed };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Supabase Methods
  private async testSupabase(): Promise<{ success: boolean; error?: string; data?: any }> {
    if (!this.config.supabaseUrl || !this.config.supabaseKey) {
      return { success: false, error: 'Supabase URL and key are required' };
    }

    try {
      const url = this.config.supabaseTable
        ? `${this.config.supabaseUrl}/rest/v1/${this.config.supabaseTable}?select=*&limit=1`
        : `${this.config.supabaseUrl}/rest/v1/`;

      const response = await fetch(url, {
        headers: {
          'apikey': this.config.supabaseKey,
          'Authorization': `Bearer ${this.config.supabaseKey}`,
        },
      });

      if (!response.ok) {
        return { success: false, error: `Supabase API error: ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async fetchFromSupabase(limit: number): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!this.config.supabaseUrl || !this.config.supabaseKey || !this.config.supabaseTable) {
      return { success: false, error: 'Supabase URL, key, and table are required' };
    }

    try {
      const response = await fetch(
        `${this.config.supabaseUrl}/rest/v1/${this.config.supabaseTable}?select=*&limit=${limit}`,
        {
          headers: {
            'apikey': this.config.supabaseKey,
            'Authorization': `Bearer ${this.config.supabaseKey}`,
          },
        }
      );

      if (!response.ok) {
        return { success: false, error: `Supabase API error: ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data: Array.isArray(data) ? data : [data] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}


