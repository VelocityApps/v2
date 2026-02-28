import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logError } from '@/lib/monitoring';

/**
 * POST /api/support/tickets
 * Create a support ticket
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject, message, priority = 'medium', automationId, userAutomationId } = body;

    // Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    // Create support ticket in support_tickets table (if exists)
    let ticketId: string | null = null;
    const { data: ticketRow, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject,
        message,
        priority,
        status: 'open',
        automation_id: automationId || null,
        user_automation_id: userAutomationId || null,
      })
      .select('id')
      .single();

    if (!ticketError && ticketRow?.id) {
      ticketId = ticketRow.id;
    } else {
      // Fallback: log as monitoring event if table doesn't exist
      await supabaseAdmin.from('monitoring_events').insert({
        event_type: 'support_ticket',
        user_id: user.id,
        event_data: {
          subject,
          message,
          priority,
          status: 'open',
          automation_id: automationId || null,
          user_automation_id: userAutomationId || null,
          created_at: new Date().toISOString(),
        },
      });
    }

    // Log error if it's a bug report
    if (priority === 'critical' || priority === 'high') {
      await logError(`Support ticket: ${subject}`, {
        component: 'support',
        route: '/api/support/tickets',
        userId: user.id,
      });
    }

    // Send email notifications (uses SMTP_* and SUPPORT_ALERT_EMAILS from env)
    let emailSent = false;
    try {
      const smtpConfigured =
        process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
      const alertEmails = (process.env.SUPPORT_ALERT_EMAILS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (smtpConfigured && alertEmails.length > 0) {
        const { sendEmail, sendAlertEmail } = await import('@/lib/email');
        // Notify support team
        await sendAlertEmail(
          `[Support] ${priority.toUpperCase()} - ${subject}`,
          `
          <h3>New Support Ticket (${priority})</h3>
          <p><strong>User:</strong> ${user.email}</p>
          <p><strong>Ticket ID:</strong> ${ticketId || 'N/A'}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <pre>${message}</pre>
        `
        );
        // Confirm to user
        if (user.email) {
          await sendEmail({
            to: user.email,
            subject: `We've received your support request: ${subject}`,
            html: `
            <p>Hi ${user.email?.split('@')[0]},</p>
            <p>Thanks for contacting VelocityApps support. We've received your request and will respond within our SLA.</p>
            <p><strong>Priority:</strong> ${priority}<br/>
            <strong>Subject:</strong> ${subject}</p>
            <p>You'll hear from us soon.</p>
            <p>— VelocityApps Support</p>
          `,
          });
        }
        emailSent = true;
      } else {
        console.warn(
          '[Support] Email skipped. Add SMTP_HOST, SMTP_USER, SMTP_PASS and SUPPORT_ALERT_EMAILS to .env.local. See SUPPORT_EMAIL_SETUP.md.'
        );
      }
    } catch (e) {
      console.warn('[Support] Email notification failed:', e);
    }

    return NextResponse.json({
      success: true,
      ticketId: ticketId,
      message: 'Support ticket created. We\'ll respond within 2 hours.',
      emailSent,
    });
  } catch (error: any) {
    console.error('[Support] Error creating ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create support ticket' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/support/tickets
 * Get user's support tickets
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's support tickets from monitoring_events
    const { data: events } = await supabaseAdmin
      .from('monitoring_events')
      .select('*')
      .eq('event_type', 'support_ticket')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const tickets = (events || []).map(event => ({
      id: event.id,
      ...event.event_data,
      createdAt: event.created_at,
    }));

    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error('[Support] Error fetching tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}

