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
  'write_price_rules',
  'write_discounts',
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
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

/**
 * Generate random state for OAuth flow
 */
function generateState(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

/** Identifies which encryption key was used to encrypt a token blob.
 *  Increment when rotating ENCRYPTION_KEY so old tokens can be re-encrypted
 *  before the previous key is retired. */
const KEY_VERSION = 'v1';

/**
 * Encrypt Shopify access token for storage
 */
export async function encryptToken(token: string): Promise<string> {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is required for token encryption');
  }

  const crypto = require('crypto');
  const algorithm = 'aes-256-gcm';
  // Key is stored as 64-char hex (32 bytes) — use directly, no KDF needed
  const key = Buffer.from(encryptionKey, 'hex');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    keyVersion: KEY_VERSION,
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  });
}

/**
 * Decrypt Shopify access token
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is required for token decryption');
  }

  try {
    const data = JSON.parse(encryptedToken);

    if (!data.authTag) {
      throw new Error('Token missing authentication tag — data is corrupted or tampered');
    }

    // keyVersion identifies which key was used; absent on legacy tokens → assume v1.
    // When rotating keys, check this field to select the correct key material.
    const keyVersion: string = data.keyVersion ?? 'v1';
    if (keyVersion !== KEY_VERSION) {
      // Log so ops can identify tokens that need re-encryption after a key rotation.
      console.warn(`[decryptToken] Token encrypted with key version ${keyVersion}, current version is ${KEY_VERSION}`);
    }

    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt token: data may be corrupted or the encryption key has changed');
  }
}



