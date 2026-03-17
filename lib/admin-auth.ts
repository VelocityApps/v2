/**
 * Admin Authentication Utility
 * 
 * Simple password-based admin authentication for admin routes.
 * In production, consider using proper JWT-based admin auth.
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { checkIpRateLimit, getClientIp } from './rate-limit';

/**
 * Verify admin password from Authorization header (Bearer token).
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyAdminPassword(request: NextRequest): boolean {
  // Rate limit admin endpoints — max 10 attempts per IP per window
  const ip = getClientIp(request);
  const rl = checkIpRateLimit(`admin:${ip}`);
  if (!rl.allowed) return false;

  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[AdminAuth] ADMIN_PASSWORD not set in environment');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const provided = authHeader.slice(7);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(adminPassword),
    );
  } catch {
    // Buffers differ in length — definitely not equal
    return false;
  }
}

