import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email/send';

/**
 * GET /api/test-welcome?to=you@example.com&name=YourName
 * POST /api/test-welcome with body: { to: "you@example.com", name?: "YourName" }
 *
 * Sends a test welcome email. Requires RESEND_API_KEY (or SMTP_PASS) and SMTP_FROM in env.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get('to');
  const name = searchParams.get('name') ?? undefined;

  if (!to) {
    return NextResponse.json(
      { error: 'Missing "to" query param. Example: /api/test-welcome?to=you@example.com&name=YourName' },
      { status: 400 }
    );
  }

  if (!to.includes('@') || !to.includes('.')) {
    return NextResponse.json(
      { error: 'Invalid "to" email. Use format: you@example.com' },
      { status: 400 }
    );
  }

  const result = await sendWelcomeEmail(to, name);

  if (result.error) {
    const isConfigError = result.error.toLowerCase().includes('not configured') || result.error.toLowerCase().includes('not set');
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        ...(isConfigError && {
          fix: 'Add RESEND_API_KEY=re_xxx to .env.local (no quotes), save, then restart: npm run dev',
          env_visible_to_server: {
            RESEND_API_KEY: !!process.env.RESEND_API_KEY,
            SMTP_PASS: !!process.env.SMTP_PASS,
          },
        }),
      },
      { status: isConfigError ? 503 : 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Welcome email sent to ${to}`,
    id: result.id,
  });
}

export async function POST(request: NextRequest) {
  let body: { to?: string; name?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body. Send { "to": "you@example.com", "name": "Optional" }' },
      { status: 400 }
    );
  }

  const { to, name } = body;

  if (!to) {
    return NextResponse.json(
      { error: 'Missing "to" in body. Example: { "to": "you@example.com", "name": "YourName" }' },
      { status: 400 }
    );
  }

  if (!to.includes('@') || !to.includes('.')) {
    return NextResponse.json(
      { error: 'Invalid "to" email. Use format: you@example.com' },
      { status: 400 }
    );
  }

  const result = await sendWelcomeEmail(to, name);

  if (result.error) {
    const isConfigError = result.error.toLowerCase().includes('not configured') || result.error.toLowerCase().includes('not set');
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        ...(isConfigError && {
          fix: 'Add RESEND_API_KEY=re_xxx to .env.local (no quotes), save, then restart: npm run dev',
          env_visible_to_server: {
            RESEND_API_KEY: !!process.env.RESEND_API_KEY,
            SMTP_PASS: !!process.env.SMTP_PASS,
          },
        }),
      },
      { status: isConfigError ? 503 : 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Welcome email sent to ${to}`,
    id: result.id,
  });
}
