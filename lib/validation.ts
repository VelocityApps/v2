/**
 * Input validation utilities
 */

/**
 * Validate Shopify store URL
 */
export function validateShopifyStoreUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Remove protocol if present
  const cleanUrl = url.replace(/^https?:\/\//, '').toLowerCase();
  
  // Must end with .myshopify.com
  if (!cleanUrl.endsWith('.myshopify.com')) {
    // Allow just the store name
    if (!cleanUrl.includes('.')) {
      return /^[a-z0-9-]+$/.test(cleanUrl);
    }
    return false;
  }
  
  // Extract store name
  const storeName = cleanUrl.replace('.myshopify.com', '');
  
  // Store name validation: 3-40 chars, alphanumeric and hyphens
  return /^[a-z0-9-]{3,40}$/.test(storeName);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML tags
}

/**
 * Validate UUID
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate automation configuration
 */
export function validateAutomationConfig(config: any): boolean {
  if (!config || typeof config !== 'object') return false;
  
  // Check for circular references and excessive nesting
  try {
    JSON.stringify(config);
  } catch {
    return false;
  }
  
  // Limit config size (prevent DoS)
  if (JSON.stringify(config).length > 10000) {
    return false;
  }
  
  return true;
}

