import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/lib/email';
import { verifyAdminPassword } from '@/lib/admin-auth';

/**
 * POST /api/test/email
 * Test email sending functionality — admin only
 */
export async function POST(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to } = body;

    if (!to || typeof to !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email address (to) is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Check if SMTP is configured
    const smtpConfigured = 
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS;

    if (!smtpConfigured) {
      return NextResponse.json({
        success: false,
        error: 'SMTP not configured',
        details: 'Missing SMTP environment variables. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local',
        configured: {
          SMTP_HOST: !!process.env.SMTP_HOST,
          SMTP_PORT: !!process.env.SMTP_PORT,
          SMTP_USER: !!process.env.SMTP_USER,
          SMTP_PASS: !!process.env.SMTP_PASS,
          SMTP_FROM: !!process.env.SMTP_FROM,
        },
      }, { status: 500 });
    }

    // Send test email
    await sendTestEmail(to);

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      to,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[TestEmail] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send test email',
    }, { status: 500 });
  }
}

/**
 * GET /api/test/email
 * Check email configuration status
 */
export async function GET(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const smtpConfigured =
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASS;

  return NextResponse.json({ configured: smtpConfigured });
}
