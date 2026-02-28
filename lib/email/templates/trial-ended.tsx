import React from 'react';
import { Button, Heading, Section, Text } from '@react-email/components';
import { EmailLayout, BRAND } from './_layout';

export interface TrialEndedEmailProps {
  automationName: string;
  reactivateUrl: string;
}

export function TrialEndedEmail({ automationName, reactivateUrl }: TrialEndedEmailProps) {
  return (
    <EmailLayout
      preview={`Your ${automationName} trial has ended — reactivate to resume.`}
    >
      {/* Badge */}
      <Section style={badgeSection}>
        <span style={badge}>Trial Ended</span>
      </Section>

      <Heading as="h1" style={h1}>
        Your trial has ended
      </Heading>

      <Text style={body}>
        Your free trial of <strong>{automationName}</strong> has ended and the automation has
        been paused. No charges have been made.
      </Text>

      <Text style={body}>
        To resume <strong>{automationName}</strong> and keep your store running automatically —
        reactivate with a subscription. Your full configuration is saved and ready to go.
      </Text>

      {/* What happens now */}
      <Section style={infoCard}>
        <Text style={infoHeading}>What's paused:</Text>
        <Text style={infoItem}>✗ &nbsp;Webhook events from your Shopify store are not processed</Text>
        <Text style={infoItem}>✗ &nbsp;Scheduled emails are not sent</Text>
        <Text style={infoItemLast}>✓ &nbsp;Your configuration and data are saved — nothing is lost</Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={reactivateUrl}>
          Reactivate {automationName}
        </Button>
      </Section>

      <Text style={footnote}>
        Changed your mind?{' '}
        <a href="https://velocityapps.dev/support" style={link}>
          Contact support
        </a>{' '}
        — we're happy to help.
      </Text>
    </EmailLayout>
  );
}

export default TrialEndedEmail;

const badgeSection: React.CSSProperties = { textAlign: 'center', marginBottom: '20px' };

const badge: React.CSSProperties = {
  backgroundColor: '#FEE2E2',
  color: '#991B1B',
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
  margin: '0 0 24px 0',
};

const infoHeading: React.CSSProperties = {
  color: '#374151',
  fontSize: '13px',
  fontWeight: 600,
  margin: '0 0 10px 0',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const infoItem: React.CSSProperties = {
  color: '#4B5563',
  fontSize: '14px',
  margin: '0 0 6px 0',
};

const infoItemLast: React.CSSProperties = { ...infoItem, margin: 0 };

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
