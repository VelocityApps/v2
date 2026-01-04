/**
 * Admin Authentication Utility
 * 
 * Simple password-based admin authentication for admin routes.
 * In production, consider using proper JWT-based admin auth.
 */

import { NextRequest } from 'next/server';

/**
 * Verify admin password from request
 */
export function verifyAdminPassword(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error('[AdminAuth] ADMIN_PASSWORD not set in environment');
    return false;
  }

  // Get password from query parameter
  const url = new URL(request.url);
  const providedPassword = url.searchParams.get('password');

  return providedPassword === adminPassword;
}

