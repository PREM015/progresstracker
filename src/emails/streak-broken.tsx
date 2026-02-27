// src/emails/streak-broken.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface StreakBrokenProps {
  userName: string;
  brokenStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  encouragementMessage?: string;
}

export const StreakBrokenEmail: React.FC<StreakBrokenProps> = ({
  userName = 'there',
  brokenStreak = 0,
  longestStreak = 0,
  lastActivityDate = new Date().toISOString(),
  encouragementMessage = "Don't worry! Every expert was once a beginner. What matters is getting back on track.",
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview={`Your ${brokenStreak}-day streak has ended`}>
      <Section style={sadBanner}>
        <Text style={sadEmoji}>💔</Text>
        <Text style={sadTitle}>Streak Ended</Text>
      </Section>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Your <strong>{brokenStreak}-day streak</strong> has come to an end. We know it&apos;s
        disappointing, but don&apos;t let this discourage you!
      </Text>

      <Card variant="default">
        <Section style={statsRow}>
          <Section style={statItem}>
            <Text style={statNumber}>{brokenStreak}</Text>
            <Text style={statLabel}>Days Achieved</Text>
          </Section>
          <Section style={statItem}>
            <Text style={statNumber}>{longestStreak}</Text>
            <Text style={statLabel}>Personal Best</Text>
          </Section>
        </Section>
      </Card>

      <Card variant="info" title="💪 Remember">
        <Text style={{ margin: 0, fontSize: '14px', fontStyle: 'italic' }}>
          &ldquo;{encouragementMessage}&rdquo;
        </Text>
      </Card>

      <Text style={paragraph}>
        <strong>What you accomplished:</strong>
      </Text>
      <Text style={paragraph}>
        {brokenStreak >= 7 && '✅ You maintained consistency for over a week!'}
        {brokenStreak >= 30 && (
          <>
            <br />✅ You built a month-long habit!
          </>
        )}
        {brokenStreak >= 100 && (
          <>
            <br />✅ You achieved triple-digit consistency!
          </>
        )}
        {brokenStreak < 7 && '✅ You made progress, and that counts!'}
      </Text>

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/dashboard`} variant="success">
          Start a New Streak Today! 🔥
        </Button>
      </Section>

      <Text style={paragraph}>
        Your last activity was on{' '}
        <strong>{new Date(lastActivityDate).toLocaleDateString()}</strong>. The best time to
        continue is right now!
      </Text>

      <Card variant="success" title="💡 Tips to Stay Consistent">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          • Set a daily reminder at a specific time
          <br />
          • Start with small, achievable goals
          <br />
          • Use our streak-at-risk notifications
          <br />• Track your progress to stay motivated
        </Text>
      </Card>

      <Text style={signoff}>You can do this! 🚀</Text>
    </EmailLayout>
  );
};

const sadBanner = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};
const sadEmoji = { fontSize: '48px', margin: '0 0 8px' };
const sadTitle = { fontSize: '24px', fontWeight: 'bold', color: '#6b7280', margin: 0 };
const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };
const statsRow = { display: 'flex', justifyContent: 'space-around' };
const statItem = { textAlign: 'center' as const };
const statNumber = { fontSize: '36px', fontWeight: 'bold', color: '#3b82f6', margin: 0 };
const statLabel = { fontSize: '12px', color: '#6b7280', margin: '4px 0 0', textTransform: 'uppercase' as const };
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' };
const signoff = { fontSize: '16px', color: '#374151', margin: '24px 0 0', textAlign: 'center' as const, fontWeight: 'bold' };

export default StreakBrokenEmail;