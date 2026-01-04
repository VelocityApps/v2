import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logEvent } from '@/lib/monitoring';

/**
 * POST /api/feedback
 * 
 * Submit user feedback
 * Note: User authentication is optional - feedback can be submitted anonymously
 */
export async function POST(request: NextRequest) {
  try {
    // User ID will be null for anonymous feedback
    // In production, you can extract user from session cookies if needed
    let userId: string | null = null;

    const { type, message, email, nps_score } = await request.json();

    if (!type) {
      return NextResponse.json(
        { error: 'Feedback type is required' },
        { status: 400 }
      );
    }

    // Validate NPS score if provided
    if (type === 'nps' && (nps_score === undefined || nps_score < 0 || nps_score > 10)) {
      return NextResponse.json(
        { error: 'NPS score must be between 0 and 10' },
        { status: 400 }
      );
    }

    // Insert feedback into database
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        user_id: userId,
        type,
        message: message || null,
        email: email || null,
        nps_score: nps_score !== undefined ? nps_score : null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log feedback event
    await logEvent('generation', {
      feedback_type: type,
      has_message: !!message,
      nps_score: nps_score || null,
    }, userId || undefined);

    // Auto-email on critical feedback (Bug reports)
    if (type === 'bug') {
      // Log for email sending (in production, integrate with email service)
      console.log(`[Feedback] Critical bug report received from ${email || userId || 'anonymous'}:`, message);
      // TODO: Integrate with email service (Resend, SendGrid, etc.)
      // await sendEmail({
      //   to: process.env.ADMIN_EMAIL,
      //   subject: `[Bug Report] ${message?.substring(0, 50)}...`,
      //   body: `User: ${email || userId || 'anonymous'}\n\n${message}`,
      // });
    }

    // Log "Love it" feedback for testimonials
    if (type === 'love_it' || (type === 'nps' && nps_score && nps_score >= 9 && message)) {
      console.log(`[Feedback] Positive feedback/testimonial from ${email || userId || 'anonymous'}:`, message);
      // TODO: Store in testimonials collection or send to admin
    }

    return NextResponse.json({ 
      success: true,
      feedback_id: data.id,
    });
  } catch (error: any) {
    console.error('[Feedback] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
