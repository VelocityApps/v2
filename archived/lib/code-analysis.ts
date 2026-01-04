/**
 * Code Analysis Utilities
 * Extract useful information from generated code
 */

/**
 * Extract Prisma model names from schema
 */
export function extractPrismaModels(code: string): string[] {
  const modelRegex = /model\s+(\w+)\s*{/g;
  const models: string[] = [];
  let match;
  while ((match = modelRegex.exec(code)) !== null) {
    models.push(match[1]);
  }
  return models;
}

/**
 * Extract database type from Prisma schema
 */
export function extractPrismaDatabaseType(code: string): string {
  const datasourceMatch = code.match(/datasource\s+db\s*{[\s\S]*?provider\s*=\s*"(\w+)"/i);
  return datasourceMatch ? datasourceMatch[1] : 'postgresql';
}

/**
 * Extract table names from SQL
 */
export function extractTableNames(sql: string): string[] {
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi;
  const tables: string[] = [];
  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    tables.push(match[1]);
  }
  return [...new Set(tables)]; // Remove duplicates
}

/**
 * Extract API endpoints from code
 */
export interface ApiEndpoint {
  method: string;
  path: string;
}

export function extractApiEndpoints(code: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  // Express.js patterns
  const expressPatterns = [
    /app\.(get|post|put|delete|patch|put)\s*\(\s*['"]([^'"]+)['"]/gi,
    /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi,
  ];
  
  expressPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }
  });
  
  // FastAPI patterns
  const fastApiPattern = /@(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi;
  let match;
  while ((match = fastApiPattern.exec(code)) !== null) {
    endpoints.push({
      method: match[2].toUpperCase(),
      path: match[3]
    });
  }
  
  return endpoints;
}

/**
 * Extract Shopify app features
 */
export function extractShopifyFeatures(code: string): string[] {
  const features: string[] = [];
  if (code.includes('products') || code.includes('product')) features.push('Product Management');
  if (code.includes('orders') || code.includes('order')) features.push('Order Management');
  if (code.includes('customers') || code.includes('customer')) features.push('Customer Management');
  if (code.includes('webhook') || code.includes('webhooks')) features.push('Webhooks');
  if (code.includes('billing') || code.includes('subscription')) features.push('Subscription Billing');
  if (code.includes('inventory') || code.includes('stock')) features.push('Inventory Tracking');
  if (code.includes('review') || code.includes('rating')) features.push('Product Reviews');
  return features;
}

/**
 * Detect Shopify app type
 */
export function detectShopifyAppType(code: string): string {
  if (code.includes('review') || code.includes('rating')) return 'Product Reviews';
  if (code.includes('inventory') || code.includes('stock')) return 'Inventory Tracker';
  if (code.includes('order') && code.includes('management')) return 'Order Management';
  if (code.includes('email') || code.includes('automation')) return 'Email Automation';
  if (code.includes('analytics') || code.includes('dashboard')) return 'Analytics Dashboard';
  return 'Custom Shopify App';
}

/**
 * Detect API framework
 */
export function detectApiFramework(code: string): string {
  if (code.includes('express()') || code.includes('express(')) return 'Express.js';
  if (code.includes('FastAPI') || code.includes('from fastapi')) return 'FastAPI (Python)';
  if (code.includes('flask') || code.includes('Flask')) return 'Flask (Python)';
  if (code.includes('Hono')) return 'Hono';
  if (code.includes('NestJS') || code.includes('@nestjs')) return 'NestJS';
  return 'Node.js';
}

/**
 * Extract Chrome extension manifest version
 */
export function extractManifestVersion(code: string): string {
  const match = code.match(/"manifest_version"\s*:\s*(\d+)/);
  return match ? match[1] : '3';
}

/**
 * Extract Chrome extension permissions
 */
export function extractChromePermissions(code: string): string[] {
  const permissionsMatch = code.match(/"permissions"\s*:\s*\[([^\]]+)\]/);
  if (!permissionsMatch) return [];
  
  const permissions = permissionsMatch[1]
    .split(',')
    .map(p => p.trim().replace(/['"]/g, ''))
    .filter(p => p.length > 0);
  
  return permissions;
}

/**
 * Check if SQL has specific features
 */
export function extractSQLFeatures(sql: string): string[] {
  const features: string[] = [];
  if (sql.match(/ROW\s+LEVEL\s+SECURITY/i)) features.push('Row Level Security');
  if (sql.match(/TRIGGER/i)) features.push('Triggers');
  if (sql.match(/uuid_generate|gen_random_uuid/i)) features.push('UUID Generation');
  if (sql.match(/FUNCTION/i)) features.push('Functions');
  if (sql.match(/INDEX/i)) features.push('Indexes');
  return features;
}

