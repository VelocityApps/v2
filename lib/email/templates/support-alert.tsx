import React from 'react';
import { Button, Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout, BRAND } from './_layout';

export interface SupportAlertEmailProps {
  userEmail: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  ticketId?: string;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  high: { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  medium: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  low: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
};

export function SupportAlertEmail({
  userEmail,
  subject,
  message,
  priority,
  ticketId,
}: SupportAlertEmailProps) {
  const colors = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium;
  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);

  return (
    <EmailLayout preview={`[${priorityLabel}] New support ticket: ${subject}`}>
      {/* Priority banner */}
      <Section
        style={{
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: '13px',
            fontWeight: 700,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {priorityLabel} Priority Ticket
        </Text>
      </Section>

      <Heading as="h1" style={h1}>
        New Support Ticket
      </Heading>

      {/* Ticket meta */}
      <Section style={metaCard}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={metaLabel}>From</td>
              <td style={metaValue}>{userEmail}</td>
            </tr>
            <tr>
              <td style={metaLabel}>Subject</td>
              <td style={metaValue}>{subject}</td>
            </tr>
            <tr>
              <td style={metaLabel}>Priority</td>
              <td style={metaValue}>{priorityLabel}</td>
            </tr>
            {ticketId && (
              <tr>
                <td style={metaLabel}>Ticket ID</td>
                <td style={{ ...metaValue, fontFamily: 'monospace', fontSize: '12px' }}>
                  {ticketId}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Text style={sectionLabel}>Message</Text>
      <Section style={messageBox}>
        <Text style={messageText}>{message}</Text>
      </Section>

      <Section style={ctaSection}>
        <Button
          style={ctaButton}
          href="https://supabase.com/dashboard/project/ofkohtektddpflcdbsma/editor"
        >
          View in Supabase
        </Button>
      </Section>

      <Hr style={{ borderColor: '#E5E7EB', margin: '8px 0' }} />

      <Text style={footnote}>
        Reply directly to this email to respond to the user at <strong>{userEmail}</strong>
      </Text>
    </EmailLayout>
  );
}

export default SupportAlertEmail;

const h1: React.CSSProperties = {
  color: '#111827',
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 20px 0',
};

const metaCard: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  borderRadius: '8px',
  border: '1px solid #E5E7EB',
  padding: '16px 20px',
  margin: '0 0 24px 0',
};

const metaLabel: React.CSSProperties = {
  color: '#6B7280',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  padding: '6px 12px 6px 0',
  whiteSpace: 'nowrap' as const,
  verticalAlign: 'top',
  width: '90px',
};

const metaValue: React.CSSProperties = {
  color: '#111827',
  fontSize: '14px',
  padding: '6px 0',
  verticalAlign: 'top',
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
  color: '#374151',
  fontSize: '14px',
  lineHeight: 1.7,
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
};

const ctaSection: React.CSSProperties = { textAlign: 'center', margin: '0 0 24px 0' };

const ctaButton: React.CSSProperties = {
  backgroundColor: BRAND,
  borderRadius: '8px',
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: 600,
  padding: '10px 24px',
  textDecoration: 'none',
};

const footnote: React.CSSProperties = {
  color: '#6B7280',
  fontSize: '13px',
  textAlign: 'center',
  margin: 0,
};
