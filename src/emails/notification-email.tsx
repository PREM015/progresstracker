// src/emails/notification-email.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface NotificationEmailProps {
  userName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export const NotificationEmail = ({
  userName = 'User',
  title,
  message,
  actionUrl,
  actionLabel,
  imageUrl,
  priority = 'normal',
}: NotificationEmailProps) => {
  const priorityColors = {
    low: '#6c757d',
    normal: '#667eea',
    high: '#f59e0b',
    urgent: '#ef4444',
  };

  const color = priorityColors[priority];

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, backgroundColor: color }}>
            <Heading style={h1}>{title}</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hi {userName},</Text>

            {imageUrl && (
              <Img
                src={imageUrl}
                alt="Notification image"
                style={image}
              />
            )}

            <Text style={paragraph}>{message}</Text>

            {actionUrl && actionLabel && (
              <Section style={buttonContainer}>
                <Button
                  style={{ ...button, backgroundColor: color }}
                  href={actionUrl}
                >
                  {actionLabel}
                </Button>
              </Section>
            )}
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Your App. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default NotificationEmail;

// Styles
const main = {
  backgroundColor: '#f4f4f4',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
};

const header = {
  padding: '40px 40px 20px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
};

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '40px',
  backgroundColor: '#ffffff',
};

const greeting = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#333333',
  marginBottom: '20px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#333333',
  marginBottom: '20px',
};

const image = {
  width: '100%',
  maxWidth: '520px',
  margin: '20px 0',
  borderRadius: '8px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  padding: '14px 30px',
  color: '#ffffff',
  textDecoration: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  display: 'inline-block',
};

const footer = {
  padding: '20px 40px',
  backgroundColor: '#f8f9fa',
  textAlign: 'center' as const,
  borderTop: '1px solid #e9ecef',
  borderRadius: '0 0 8px 8px',
};

const footerText = {
  margin: '0',
  color: '#6c757d',
  fontSize: '14px',
};