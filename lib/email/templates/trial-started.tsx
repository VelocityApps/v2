import React from 'react';
import { Button, Heading, Section, Text } from '@react-email/components';
import { EmailLayout, BRAND } from './_layout';

export interface TrialStartedEmailProps {
  automationName: string;
  trialEndsAt: Date;
  dashboardUrl?: string;
}

export function TrialStartedEmail({
  automationName,
  trialEndsAt,
  dashboardUrl = 'https://velocityapps.dev/dashboard',
}: TrialStartedEmailProps) {
  const endDateStr = trialEndsAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <EmailLayout preview={`Your ${automationName} trial has started – 7 days of full access.`}>
      {/* Badge */}
      <Section style={badgeSection}>
        <span style={badge}>Trial Active</span>
      </Section>

      <Heading as="h1" style={h1}>
        Your trial has started
      </Heading>

      <Text style={body}>
        You now have <strong>full access to {automationName}</strong> for the next 7 days — no
        credit card required yet.
      </Text>

      {/* Info card */}
      <Section style={infoCard}>
        <Text style={infoRow}>
          <strong>Automation:</strong> {automationName}
        </Text>
        <Text style={infoRow}>
          <strong>Trial period:</strong> 7 days
        </Text>
        <Text style={infoRowLast}>
          <strong>Trial ends:</strong> {endDateStr}
        </Text>
      </Section>

      <Text style={body}>
        To keep {automationName} running after your trial, add a payment method before{' '}
        <strong>{endDateStr}</strong>. You won't be charged until the trial ends.
      </Text>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={dashboardUrl}>
          Go to Dashboard
        </Button>
      </Section>

      <Text style={footnote}>
        Have questions? Reply to this email or visit{' '}
        <a href="https://velocityapps.dev/support" style={link}>
          velocityapps.dev/support
        </a>
      </Text>
    </EmailLayout>
  );
}

export default TrialStartedEmail;

const badgeSection: React.CSSProperties = { textAlign: 'center', marginBottom: '20px' };

const badge: React.CSSProperties = {
  backgroundColor: '#D1FAE5',
  color: '#065F46',
  fontSize: '12px',
  fontWeight: 600,
  padding: '4px 12px',
  borderRadius: '999px',
  letterSpacing: '0.3px',
};

const h1: React.CSSProperties = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: 700,
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const body: React.CSSProperties = {
  color: '#4B5563',
  fontSize: '16px',
  lineHeight: 1.6,
  margin: '0 0 20px 0',
};

const infoCard: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  borderRadius: '8px',
  border: '1px solid #E5E7EB',
  padding: '16px 20px',
  margin: '0 0 20px 0',
};

const infoRow: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 8px 0',
};

const infoRowLast: React.CSSProperties = { ...infoRow, margin: 0 };

const ctaSection: React.CSSProperties = { textAlign: 'center', margin: '28px 0' };

const ctaButton: React.CSSProperties = {
  backgroundColor: BRAND,
  borderRadius: '8px',
  color: '#FFFFFF',
  fontSize: '15px',
  fontWeight: 600,
  padding: '12px 28px',
  textDecoration: 'none',
};

const footnote: React.CSSProperties = {
  color: '#9CA3AF',
  fontSize: '13px',
  textAlign: 'center',
  margin: 0,
};

const link: React.CSSProperties = { color: BRAND };
