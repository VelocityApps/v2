import React from 'react';
import { Button, Heading, Section, Text } from '@react-email/components';
import { EmailLayout, BRAND } from './_layout';

export interface TrialReminderEmailProps {
  automationName: string;
  trialEndsAt: Date;
  upgradeUrl?: string;
}

export function TrialReminderEmail({
  automationName,
  trialEndsAt,
  upgradeUrl = 'https://velocityapps.dev/dashboard',
}: TrialReminderEmailProps) {
  const endDateStr = trialEndsAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <EmailLayout
      preview={`2 days left on your ${automationName} trial — keep it running.`}
    >
      {/* Badge */}
      <Section style={badgeSection}>
        <span style={badge}>Trial Ending Soon</span>
      </Section>

      <Heading as="h1" style={h1}>
        2 days left on your trial
      </Heading>

      <Text style={body}>
        Your free trial of <strong>{automationName}</strong> ends on{' '}
        <strong>{endDateStr}</strong>.
      </Text>

      <Text style={body}>
        After that, the automation will be paused and your Shopify store won't receive any more
        events from it. Add a payment method now to keep it running without any interruption.
      </Text>

      {/* Urgency card */}
      <Section style={urgencyCard}>
        <Text style={urgencyText}>
          ⏰ &nbsp;Trial ends <strong>{endDateStr}</strong> — don't lose your setup.
        </Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={upgradeUrl}>
          Add Payment Method
        </Button>
      </Section>

      <Text style={footnote}>
        Not ready to upgrade? You can cancel anytime with no charge. Questions?{' '}
        <a href="https://velocityapps.dev/support" style={link}>
          Contact support
        </a>
      </Text>
    </EmailLayout>
  );
}

export default TrialReminderEmail;

const badgeSection: React.CSSProperties = { textAlign: 'center', marginBottom: '20px' };

const badge: React.CSSProperties = {
  backgroundColor: '#FEF3C7',
  color: '#92400E',
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

const urgencyCard: React.CSSProperties = {
  backgroundColor: '#FFFBEB',
  borderRadius: '8px',
  border: '1px solid #FCD34D',
  padding: '14px 20px',
  margin: '0 0 24px 0',
  textAlign: 'center',
};

const urgencyText: React.CSSProperties = {
  color: '#92400E',
  fontSize: '14px',
  margin: 0,
};

const ctaSection: React.CSSProperties = { textAlign: 'center', margin: '28px 0' };

const ctaButton: React.CSSProperties = {
  backgroundColor: '#D97706',
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
