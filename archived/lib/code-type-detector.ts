/**
 * Enhanced Code Type Detection
 * Detects specific code types to show context-appropriate preview panels
 */

export interface CodeType {
  type: 'BROWSER_PREVIEWABLE' | 'DATABASE' | 'SHOPIFY_APP' | 'API' | 'CHROME_EXTENSION' | 'DISCORD_BOT' | 'CONFIG' | 'GENERIC';
  subtype?: string;
  framework?: string;
}

/**
 * Detect code type from code content and filename
 */
export function detectCodeType(code: string, filename?: string): CodeType {
  const lowerCode = code.toLowerCase();
  const lowerFilename = filename?.toLowerCase() || '';

  // Prisma schema
  if (lowerFilename.includes('schema.prisma') || 
      (lowerCode.includes('model ') && lowerCode.includes('datasource'))) {
    return { type: 'DATABASE', subtype: 'PRISMA' };
  }

  // Supabase SQL
  if ((lowerCode.includes('create table') || lowerCode.includes('alter table')) &&
      (lowerCode.includes('supabase') || lowerCode.includes('uuid_generate_v4()') || 
       lowerCode.includes('gen_random_uuid()'))) {
    return { type: 'DATABASE', subtype: 'SUPABASE' };
  }

  // Generic SQL
  if (lowerCode.includes('create table') || 
      lowerCode.includes('alter table') || 
      lowerCode.includes('create database') ||
      lowerCode.includes('insert into') ||
      lowerCode.includes('select ') && lowerCode.includes('from ')) {
    return { type: 'DATABASE', subtype: 'SQL' };
  }

  // Shopify app
  if (lowerCode.includes('shopify.app.toml') || 
      lowerCode.includes('@shopify/polaris') ||
      lowerCode.includes('@shopify/shopify-app-remix') ||
      lowerCode.includes('remix') && lowerCode.includes('shopify')) {
    return { type: 'SHOPIFY_APP', subtype: 'REMIX' };
  }

  // Chrome extension
  if (lowerFilename.includes('manifest.json') || 
      lowerCode.includes('"manifest_version"') ||
      lowerCode.includes('chrome.runtime') ||
      lowerCode.includes('chrome.tabs')) {
    return { type: 'CHROME_EXTENSION' };
  }

  // Discord bot
  if (lowerCode.includes('discord.js') || 
      lowerCode.includes('discord.py') ||
      lowerCode.includes('discord.client') ||
      lowerCode.includes('client.login')) {
    return { type: 'DISCORD_BOT' };
  }

  // API/Backend detection
  if (lowerCode.includes('express()') || lowerCode.includes('express(')) {
    return { type: 'API', subtype: 'EXPRESS', framework: 'Express.js' };
  }
  
  if (lowerCode.includes('fastapi') || lowerCode.includes('from fastapi')) {
    return { type: 'API', subtype: 'FASTAPI', framework: 'FastAPI (Python)' };
  }
  
  if (lowerCode.includes('flask') || lowerCode.includes('from flask')) {
    return { type: 'API', subtype: 'FLASK', framework: 'Flask (Python)' };
  }
  
  if (lowerCode.includes('app.get(') || lowerCode.includes('app.post(') ||
      lowerCode.includes('router.get(') || lowerCode.includes('router.post(')) {
    return { type: 'API', subtype: 'GENERIC', framework: 'Node.js' };
  }

  // Config files
  if (lowerFilename.includes('.env') || 
      lowerFilename.includes('env.example') ||
      (lowerCode.includes('api_key') && lowerCode.includes('secret')) ||
      (lowerCode.includes('api_key=') || lowerCode.includes('secret_key='))) {
    return { type: 'CONFIG', subtype: 'ENV' };
  }

  if (lowerFilename.includes('package.json') && !lowerCode.includes('react') && !lowerCode.includes('next')) {
    return { type: 'CONFIG', subtype: 'PACKAGE_JSON' };
  }

  // React/Next.js - browser previewable
  if (lowerCode.includes('react') || 
      lowerCode.includes('next') ||
      lowerCode.includes('jsx') ||
      lowerCode.includes('tsx') ||
      lowerCode.includes('import react')) {
    return { type: 'BROWSER_PREVIEWABLE' };
  }

  // HTML - browser previewable
  if (lowerCode.includes('<!doctype') || 
      lowerCode.includes('<html') ||
      lowerFilename.includes('.html')) {
    return { type: 'BROWSER_PREVIEWABLE' };
  }

  // Default
  return { type: 'GENERIC' };
}

