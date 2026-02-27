// src/emails/streak-at-risk.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';
import type { StreakAtRiskProps } from '@/types/email';

export const StreakAtRiskEmail: React.FC<StreakAtRiskProps> = ({
  userName = 'there',
  currentStreak = 0,
  hoursRemaining = 6,
  suggestedActions = [
    'Solve a quick LeetCode easy problem',
    'Make a small commit on GitHub',
    'Complete a lesson on your learning platform',
  ],
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview={`Your ${currentStreak}-day streak is at risk!`}>
      <Section style={alertBanner}>
        <Text style={alertEmoji}>⚠️</Text>
        <Text style={alertTitle}>Streak At Risk!</Text>
      </Section>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Your <strong>{currentStreak}-day streak</strong> is about to end! You have approximately{' '}
        <strong>{hoursRemaining} hours</strong> left to log some activity.
      </Text>

      <Card variant="danger">
        <Section style={streakDisplay}>
          <Text style={streakNumber}>{currentStreak}</Text>
          <Text style={streakLabel}>day streak 🔥</Text>
        </Section>
      </Card>

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/dashboard`} variant="success">
          Save Your Streak Now
        </Button>
      </Section>

      <Card variant="info" title="💡 Quick Ideas">
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {suggestedActions.map((action, index) => (
            <li key={index} style={{ marginBottom: '8px', color: '#374151' }}>
              {action}
            </li>
          ))}
        </ul>
      </Card>

      <Text style={paragraph}>
        Even a small contribution counts! Don&apos;t let all that hard work go to waste.
      </Text>

      <Text style={smallText}>
        You&apos;re receiving this because you have streak alerts enabled.
      </Text>
    </EmailLayout>
  );
};

const alertBanner = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const alertEmoji = {
  fontSize: '48px',
  margin: '0 0 8px',
};

const alertTitle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#dc2626',
  margin: 0,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
};

const streakDisplay = {
  textAlign: 'center' as const,
};

const streakNumber = {
  fontSize: '64px',
  fontWeight: 'bold',
  color: '#f59e0b',
  margin: 0,
  lineHeight: 1,
};

const streakLabel = {
  fontSize: '18px',
  color: '#374151',
  margin: '8px 0 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const smallText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '24px 0 0',
};

export default StreakAtRiskEmail;