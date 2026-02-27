// src/emails/components/EmailLayout.tsx
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.vercel.app';

export const EmailLayout: React.FC<EmailLayoutProps> = ({ preview, children }) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src={`${baseUrl}/logo.png`}
              width="40"
              height="40"
              alt="ProgressTracker"
              style={logo}
            />
            <Text style={headerText}>ProgressTracker</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} ProgressTracker. All rights reserved.
            </Text>
            <Text style={footerLinks}>
              <Link href={`${baseUrl}/settings`} style={footerLink}>
                Settings
              </Link>
              {' • '}
              <Link href={`${baseUrl}/help`} style={footerLink}>
                Help
              </Link>
              {' • '}
              <Link href={`${baseUrl}/privacy`} style={footerLink}>
                Privacy
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '24px 32px',
  borderBottom: '1px solid #e6ebf1',
  textAlign: 'center' as const,
};

const logo = {
  display: 'inline-block',
  verticalAlign: 'middle',
};

const headerText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  display: 'inline-block',
  verticalAlign: 'middle',
  marginLeft: '12px',
};

const content = {
  padding: '32px',
};

const footer = {
  padding: '24px 32px',
  borderTop: '1px solid #e6ebf1',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0 0 8px',
};

const footerLinks = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0',
};

const footerLink = {
  color: '#556cd6',
  textDecoration: 'none',
};

export default EmailLayout;