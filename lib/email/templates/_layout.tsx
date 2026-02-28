import React from 'react';
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export const BRAND = '#4F46E5';
export const BRAND_DARK = '#4338CA';
export const GRAY_50 = '#F9FAFB';
export const GRAY_600 = '#4B5563';
export const GRAY_700 = '#374151';
export const GRAY_900 = '#111827';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>VelocityApps</Text>
            <Text style={tagline}>Shopify automations that just work</Text>
          </Section>

          {/* Content */}
          {children}

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} VelocityApps · hello@velocityapps.dev
            </Text>
            <Text style={footerMuted}>
              You received this because you have an account at velocityapps.dev
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: '#F3F4F6',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  margin: 0,
  padding: '24px 0',
};

const container: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '600px',
  padding: '40px 32px',
  width: '100%',
};

const header: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '32px',
  paddingBottom: '24px',
  borderBottom: '1px solid #E5E7EB',
};

const logoText: React.CSSProperties = {
  color: BRAND,
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 4px 0',
  letterSpacing: '-0.3px',
};

const tagline: React.CSSProperties = {
  color: GRAY_600,
  fontSize: '13px',
  margin: 0,
};

const hr: React.CSSProperties = {
  borderColor: '#E5E7EB',
  margin: '32px 0 24px 0',
};

const footer: React.CSSProperties = {
  textAlign: 'center',
};

const footerText: React.CSSProperties = {
  color: '#9CA3AF',
  fontSize: '12px',
  margin: '0 0 4px 0',
};

const footerMuted: React.CSSProperties = {
  color: '#D1D5DB',
  fontSize: '11px',
  margin: 0,
};
