import React from 'react';
import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout, BRAND } from './_layout';

export interface SupportConfirmationEmailProps {
  userName?: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  ticketId?: string;
}

const SLA_MAP: Record<string, string> = {
  critical: '< 1 hour',
  high: '< 2 hours',
  medium: '< 4 hours',
  low: '< 24 hours',
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEE2E2', text: '#991B1B' },
  high: { bg: '#FFEDD5', text: '#9A3412' },
  medium: { bg: '#FEF3C7', text: '#92400E' },
  low: { bg: '#DBEAFE', text: '#1E40AF' },
};

export function SupportConfirmationEmail({
  userName,
  subject,
  message,
  priority,
  ticketId,
}: SupportConfirmationEmailProps) {
  const greeting = userName ? `Hi ${userName}` : 'Hi there';
  const sla = SLA_MAP[priority] ?? '< 4 hours';
  const colors = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium;

  return (
    <EmailLayout preview={`We've received your support request: ${subject}`}>
      <Heading as="h1" style={h1}>
        We've got your message
      </Heading>

      <Text style={body}>
        {greeting}, we've received your support request and our team is on it.
      </Text>

      {/* Ticket details */}
      <Section style={card}>
        <Text style={cardLabel}>Subject</Text>
        <Text style={cardValue}>{subject}</Text>

        <Hr style={cardDivider} />

        <Text style={cardLabel}>Priority</Text>
        <Text style={cardValue}>
          <span
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              fontSize: '12px',
              fontWeight: 600,
              padding: '2px 10px',
              borderRadius: '999px',
            }}
          >
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>
        </Text>

        <Hr style={cardDivider} />

        <Text style={cardLabel}>Expected response</Text>
        <Text style={cardValue}>{sla}</Text>

        {ticketId && (
          <>
            <Hr style={cardDivider} />
            <Text style={cardLabel}>Ticket ID</Text>
            <Text style={{ ...cardValue, fontFamily: 'monospace', fontSize: '13px' }}>
              {ticketId}
            </Text>
          </>
        )}
      </Section>

      <Text style={sectionLabel}>Your message</Text>
      <Section style={messageBox}>
        <Text style={messageText}>{message}</Text>
      </Section>

      <Text style={body}>
        We'll reply directly to this email. In the meantime, you can check your ticket status from
        your{' '}
        <a href="https://velocityapps.dev/dashboard" style={link}>
          dashboard
        </a>
        .
      </Text>

      <Text style={signoff}>
        — VelocityApps Support Team
        <br />
        <a href="mailto:hello@velocityapps.dev" style={link}>
          hello@velocityapps.dev
        </a>
      </Text>
    </EmailLayout>
  );
}

export default SupportConfirmationEmail;

const h1: React.CSSProperties = {
  color: '#111827',
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 16px 0',
};

const body: React.CSSProperties = {
  color: '#4B5563',
  fontSize: '15px',
  lineHeight: 1.6,
  margin: '0 0 20px 0',
};

const card: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  borderRadius: '8px',
  border: '1px solid #E5E7EB',
  padding: '16px 20px',
  margin: '0 0 24px 0',
};

const cardLabel: React.CSSProperties = {
  color: '#9CA3AF',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const cardValue: React.CSSProperties = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: 500,
  margin: '0 0 12px 0',
};

const cardDivider: React.CSSProperties = {
  borderColor: '#E5E7EB',
  margin: '8px 0 12px 0',
};

const sectionLabel: React.CSSProperties = {
  color: '#374151',
  fontSize: '13px',
  fontWeight: 600,
  margin: '0 0 8px 0',
};

const messageBox: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '6px',
  border: '1px solid #E5E7EB',
  borderLeft: `3px solid ${BRAND}`,
  padding: '12px 16px',
  margin: '0 0 24px 0',
};

const messageText: React.CSSProperties = {
  color: '#4B5563',
  fontSize: '14px',
  lineHeight: 1.6,
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
};

const signoff: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: 1.8,
  margin: '0 0 0 0',
};

const link: React.CSSProperties = { color: BRAND };
