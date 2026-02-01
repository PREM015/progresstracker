// src/emails/welcome.tsx
import { Text, Section, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';
import type { WelcomeEmailProps } from '@/types/email';

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  userName = 'there',
  email = '',
  onboardingUrl = 'https://progresstracker.vercel.cpp/onboarding',
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.vercel.app';

  return (
    <EmailLayout preview="Welcome to ProgressTracker! 🚀">
      <Text style={heading}>Welcome to ProgressTracker! 🎉</Text>

      <Text style={paragraph}>Hi {userName},
        your email {email} is now connected with us 
      </Text>

      <Text style={paragraph}>
        We&apos;re thrilled to have you join the ProgressTracker community! You&apos;ve taken the
        first step toward tracking and improving your coding journey.
      </Text>

      <Card variant="info" title="🚀 Getting Started">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          1. <strong>Connect your platforms</strong> - Link GitHub, LeetCode, and more
          <br />
          2. <strong>Set your first goal</strong> - Stay motivated with targets
          <br />
          3. <strong>Start tracking</strong> - Log your daily progress
          <br />
          4. <strong>Watch yourself grow</strong> - See beautiful analytics
        </Text>
      </Card>

      <Section style={ctaSection}>
        <Button href={onboardingUrl} variant="primary">
          Complete Your Setup
        </Button>
      </Section>

      <Section style={platformsSection}>
        <Text style={{ fontWeight: 'bold', marginBottom: '12px' }}>
          Popular platforms to connect:
        </Text>
        <Section style={platformGrid}>
          {['GitHub', 'LeetCode', 'Codeforces', 'HackerRank'].map((platform) => (
            <Text key={platform} style={platformBadge}>
              {platform}
            </Text>
          ))}
        </Section>
      </Section>

      <Text style={paragraph}>
        Need help? Check out our{' '}
        <Link href={`${baseUrl}/docs`} style={link}>
          documentation
        </Link>{' '}
        or reach out to{' '}
        <Link href={`${baseUrl}/support`} style={link}>
          support
        </Link>
        .
      </Text>

      <Text style={signoff}>
        Happy coding! 💻
        <br />
        The ProgressTracker Team
      </Text>
    </EmailLayout>
  );
};

const heading = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const platformsSection = {
  margin: '24px 0',
};

const platformGrid = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap' as const,
};

const platformBadge = {
  backgroundColor: '#f3f4f6',
  padding: '8px 16px',
  borderRadius: '20px',
  fontSize: '14px',
  color: '#374151',
  display: 'inline-block',
  margin: '4px',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
};

const signoff = {
  fontSize: '16px',
  color: '#374151',
  margin: '32px 0 0',
};

export default WelcomeEmail;