import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getEmailFrom } from '@/lib/email/send';

/**
 * POST /api/support/tickets/[id]/reply
 * User adds a follow-up reply to an existing ticket. Sends an email to support.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message } = await request.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  // Fetch the original ticket to verify ownership
  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('support_tickets')
    .select('id, subject, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (ticketError || !ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  // Forward the reply to support via email
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const alertRecipients = (process.env.SUPPORT_ALERT_EMAILS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (alertRecipients.length > 0) {
        await resend.emails.send({
          from: getEmailFrom(),
          to: alertRecipients,
          replyTo: user.email ?? undefined,
          subject: `Re: [Ticket #${id.slice(0, 8)}] ${ticket.subject}`,
          html: `<p><strong>User:</strong> ${user.email}</p><p><strong>Reply:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
        });
      }
    } catch (e) {
      console.warn('[Support] Reply email failed:', e);
    }
  }

  return NextResponse.json({ success: true });
}
