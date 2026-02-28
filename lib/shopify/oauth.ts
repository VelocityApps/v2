/**
 * Shopify OAuth Integration
 * Handles OAuth flow for connecting Shopify stores
 */

export interface ShopifyOAuthConfig {
  shop: string; // Store domain (e.g., 'mystore.myshopify.com')
  redirectUri: string;
  scopes?: string[];
  state?: string; // Optional; if not set, a random state is generated
}

export interface ShopifyTokenResponse {
  access_token: string;
  scope: string;
  expires_in?: number;
}

const DEFAULT_SCOPES = [
  'read_products',
  'write_products',
  'read_orders',
  'read_inventory',
  'write_inventory',
  'read_customers',
  'read_content',
  'write_content',
];

/**
 * Generate Shopify OAuth authorization URL
 */
export function generateShopifyAuthUrl(config: ShopifyOAuthConfig): string {
  // Normalize: strip protocol and path so we only have host
  const raw = config.shop.replace(/^https?:\/\//i, '').split('/')[0];
  const shop = raw.replace(/\.myshopify\.com$/, '') + '.myshopify.com';
  const scopes = (config.scopes || DEFAULT_SCOPES).join(',');
  const clientId = process.env.SHOPIFY_CLIENT_ID!;
  const redirectUri = encodeURIComponent(config.redirectUri);
  const state = config.state ?? generateState();

  if (!clientId) {
    throw new Error('SHOPIFY_CLIENT_ID environment variable is required');
  }

  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${clientId}&` +
    `scope=${scopes}&` +
    `redirect_uri=${redirectUri}&` +
    `state=${state}`;

  return authUrl;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<ShopifyTokenResponse> {
  const clientId = process.env.SHOPIFY_CLIENT_ID!;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!;

  if (!clientId || !clientSecret) {
    throw new Error('SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET environment variables are required');
  }

  const shopDomain = shop.replace(/\.myshopify\.com$/, '') + '.myshopify.com';
  const url = `https://${shopDomain}/admin/oauth/access_token`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

/**
 * Verify Shopify webhook HMAC signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  const calculatedSignature = hmac.digest('base64');
  return calculatedSignature === signature;
}

/**
 * Generate random state for OAuth flow
 */
function generateState(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

/**
 * Encrypt Shopify access token for storage
 */
export async function encryptToken(token: string): Promise<string> {
  // For production, use a proper encryption library like crypto-js or @noble/cipher
  // For now, we'll use a simple base64 encoding (NOT secure - replace with proper encryption)
  const encryptionKey = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY is required for token encryption');
  }

  // Proper AES-256-GCM encryption
  const crypto = require('crypto');
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = crypto.randomBytes(16); // Initialization vector
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag(); // Authentication tag (not IV!)
  
  // Store IV and authTag separately
  return JSON.stringify({
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  });
}

/**
 * Decrypt Shopify access token
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  const encryptionKey = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY is required for token decryption');
  }

  // Proper AES-256-GCM decryption
  try {
    const data = JSON.parse(encryptedToken);
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag || data.iv, 'hex'); // Support old format
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt token: data may be corrupted or the encryption key has changed');
  }
}



