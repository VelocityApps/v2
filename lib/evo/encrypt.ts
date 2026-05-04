/**
 * Evo credential encryption helpers.
 *
 * Re-uses the existing AES-256-GCM encryptToken / decryptToken from the
 * Shopify OAuth module — those functions are key-agnostic and encrypt any
 * UTF-8 string. We alias them with Evo-specific names so callers don't need
 * to import from the Shopify namespace.
 *
 * Credentials stored in evo_platforms.credentials_encrypted are a JSON blob:
 *   Shopify: { "access_token": "shpat_xxx" }
 *   Amazon:  { "lwa_access_token": "...", "lwa_refresh_token": "..." }
 *   Etsy:    { "access_token": "...", "refresh_token": "..." }
 *   eBay:    { "access_token": "...", "refresh_token": "..." }
 *
 * NEVER store plaintext credentials in any column other than
 * evo_platforms.credentials_encrypted.
 */

export { encryptToken as encryptCredentials, decryptToken as decryptCredentials } from '@/lib/shopify/oauth';
