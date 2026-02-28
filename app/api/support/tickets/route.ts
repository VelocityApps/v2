import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logError } from '@/lib/monitoring';
import { getEmailFrom } from '@/lib/email/send';
import { SupportConfirmationEmail } from '@/lib/email/templates/support-confirmation';
import { SupportAlertEmail } from '@/lib/email/templates/support-alert';

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

    // Create support ticket
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

    // Log high/critical tickets to error monitoring
    if (priority === 'critical' || priority === 'high') {
      await logError(`Support ticket: ${subject}`, {
        component: 'support',
        route: '/api/support/tickets',
        userId: user.id,
      });
    }

    // Send email notifications via Resend
    let emailSent = false;
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const resend = new Resend(apiKey);
        const from = getEmailFrom();
        const alertRecipients = (process.env.SUPPORT_ALERT_EMAILS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        const userName = user.email?.split('@')[0];

        // Send both emails concurrently
        await Promise.all([
          // Alert the support team
          alertRecipients.length > 0
            ? (async () => {
                const html = await render(
                  React.createElement(SupportAlertEmail, {
                    userEmail: user.email ?? 'unknown',
                    subject,
                    message,
                    priority,
                    ticketId: ticketId ?? undefined,
                  })
                );
                return resend.emails.send({
                  from,
                  to: alertRecipients,
                  replyTo: user.email ?? undefined,
                  subject: `[${priority.toUpperCase()}] New Support Ticket – ${subject}`,
                  html,
                });
              })()
            : Promise.resolve(),

          // Confirm to the user
          user.email
            ? (async () => {
                const html = await render(
                  React.createElement(SupportConfirmationEmail, {
                    userName,
                    subject,
                    message,
                    priority,
                    ticketId: ticketId ?? undefined,
                  })
                );
                return resend.emails.send({
                  from,
                  to: user.email!,
                  subject: `We've received your request – ${subject}`,
                  html,
                });
              })()
            : Promise.resolve(),
        ]);

        emailSent = true;
      } catch (e) {
        console.warn('[Support] Email notification failed:', e);
      }
    } else {
      console.warn('[Support] RESEND_API_KEY not set — skipping email notifications.');
    }

    return NextResponse.json({
      success: true,
      ticketId,
      message: "Support ticket created. We'll respond within 2 hours.",
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
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try support_tickets table first, fall back to monitoring_events
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('support_tickets')
      .select('id, subject, message, priority, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!ticketsError && tickets) {
      return NextResponse.json({ tickets });
    }

    // Fallback to monitoring_events
    const { data: events } = await supabaseAdmin
      .from('monitoring_events')
      .select('*')
      .eq('event_type', 'support_ticket')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const fallbackTickets = (events || []).map((event) => ({
      id: event.id,
      ...event.event_data,
      createdAt: event.created_at,
    }));

    return NextResponse.json({ tickets: fallbackTickets });
  } catch (error: any) {
    console.error('[Support] Error fetching tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}
