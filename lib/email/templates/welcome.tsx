import React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

const BRAND_INDIGO = '#4F46E5';
const BRAND_INDIGO_DARK = '#4338CA';
const GRAY_600 = '#4B5563';
const GRAY_700 = '#374151';

export interface WelcomeEmailProps {
  userName?: string;
  dashboardUrl?: string;
}

export function WelcomeEmail({ userName, dashboardUrl = 'https://velocityapps.dev/dashboard' }: WelcomeEmailProps) {
  const name = userName ?? 'there';

  return (
    <Html>
      <Head />
      <Preview>Welcome to VelocityApps – get started with Shopify automations in 3 steps.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>VelocityApps</Heading>
            <Text style={tagline}>Shopify automations that just work</Text>
          </Section>

          <Section style={content}>
            <Heading as="h1" style={h1}>
              Welcome, {name}!
            </Heading>
            <Text style={paragraph}>
              You're in. VelocityApps helps you automate your Shopify store with pre-built automations—no code, no deployment.
            </Text>

            <Heading as="h2" style={h2}>
              Get started in 3 steps
            </Heading>
            <Section style={steps}>
              <Text style={step}>
                <strong>1.</strong> Connect your Shopify store from your dashboard.
              </Text>
              <Text style={step}>
                <strong>2.</strong> Browse the marketplace and pick your first automation.
              </Text>
              <Text style={step}>
                <strong>3.</strong> Install, configure, and let it run—we handle the rest.
              </Text>
            </Section>

            <Section style={ctaSection}>
              <Button style={ctaButton} href={dashboardUrl}>
                Go to Dashboard
              </Button>
            </Section>

            <Hr style={hr} />

            <Heading as="h2" style={h2}>
              What you get
            </Heading>
            <Section style={features}>
              <Text style={feature}>✓ Free tier to explore automations</Text>
              <Text style={feature}>✓ 2-hour support response target</Text>
              <Text style={feature}>✓ Pre-built Pinterest, reviews, stock & cart automations</Text>
              <Text style={feature}>✓ No code—install from the marketplace</Text>
            </Section>

            <Text style={paragraph}>
              If you have any questions, reply to this email or open a ticket from your dashboard.
            </Text>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>© {new Date().getFullYear()} VelocityApps. All rights reserved.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;

const main: React.CSSProperties = {
  backgroundColor: '#F3F4F6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '600px',
  padding: '40px 24px',
  width: '100%',
};

const header: React.CSSProperties = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logo: React.CSSProperties = {
  color: BRAND_INDIGO,
  fontSize: '24px',
  fontWeight: 700,
  margin: '0 0 4px 0',
};

const tagline: React.CSSProperties = {
  color: GRAY_600,
  fontSize: '14px',
  margin: 0,
};

const content: React.CSSProperties = {
  marginBottom: '24px',
};

const h1: React.CSSProperties = {
  color: GRAY_700,
  fontSize: '24px',
  fontWeight: 600,
  margin: '0 0 16px 0',
};

const h2: React.CSSProperties = {
  color: GRAY_700,
  fontSize: '18px',
  fontWeight: 600,
  margin: '24px 0 12px 0',
};

const paragraph: React.CSSProperties = {
  color: GRAY_600,
  fontSize: '16px',
  lineHeight: 1.6,
  margin: '0 0 16px 0',
};

const steps: React.CSSProperties = {
  margin: '8px 0 24px 0',
};

const step: React.CSSProperties = {
  color: GRAY_600,
  fontSize: '16px',
  lineHeight: 1.6,
  margin: '0 0 8px 0',
};

const ctaSection: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const ctaButton: React.CSSProperties = {
  backgroundColor: BRAND_INDIGO,
  borderRadius: '6px',
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: 600,
  padding: '12px 24px',
  textDecoration: 'none',
};

const hr: React.CSSProperties = {
  borderColor: '#E5E7EB',
  margin: '24px 0',
};

const features: React.CSSProperties = {
  margin: '8px 0 24px 0',
};

const feature: React.CSSProperties = {
  color: GRAY_600,
  fontSize: '15px',
  lineHeight: 1.6,
  margin: '0 0 6px 0',
};

const footer: React.CSSProperties = {
  textAlign: 'center' as const,
};

const footerText: React.CSSProperties = {
  color: '#9CA3AF',
  fontSize: '12px',
  margin: 0,
};
