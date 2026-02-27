// src/emails/streak-milestone.tsx
import { Text, Section, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface StreakMilestoneProps {
  userName: string;
  streakDays: number;
  milestone: number;
  nextMilestone: number;
  totalActivities: number;
  startDate: string;
}

export const StreakMilestoneEmail: React.FC<StreakMilestoneProps> = ({
  userName = 'there',
  streakDays = 7,
  milestone = 7,
  nextMilestone = 14,
  totalActivities = 0,
  startDate = new Date().toISOString(),
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  const getMilestoneEmoji = (days: number) => {
    if (days >= 365) return '🏆';
    if (days >= 100) return '💎';
    if (days >= 50) return '🌟';
    if (days >= 30) return '🔥';
    if (days >= 14) return '⚡';
    return '🎯';
  };

  const getMilestoneMessage = (days: number) => {
    if (days >= 365) return "A FULL YEAR! You're absolutely incredible!";
    if (days >= 100) return "Triple digits! You're a coding machine!";
    if (days >= 50) return "Halfway to 100! You're unstoppable!";
    if (days >= 30) return "A whole month! You've built a real habit!";
    if (days >= 14) return 'Two weeks strong! Keep that momentum!';
    if (days >= 7) return "One week down! You're building consistency!";
    return 'Great start! Keep it going!';
  };

  return (
    <EmailLayout preview={`🎉 ${milestone}-Day Streak Milestone Achieved!`}>
      <Section style={celebrationBanner}>
        <Text style={celebrationEmoji}>{getMilestoneEmoji(milestone)}</Text>
        <Text style={celebrationNumber}>{milestone}</Text>
        <Text style={celebrationTitle}>Day Streak!</Text>
      </Section>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        <strong>{getMilestoneMessage(milestone)}</strong>
      </Text>

      <Text style={paragraph}>
        You&apos;ve been consistently coding for <strong>{streakDays} days straight</strong>. This
        is an incredible achievement that shows real dedication.
      </Text>

      <Card variant="success" title="🎯 Your Stats">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Current Streak:</strong> {streakDays} days 🔥
          <br />
          <strong>Total Activities:</strong> {totalActivities}
          <br />
          <strong>Streak Started:</strong> {new Date(startDate).toLocaleDateString()}
          <br />
          <strong>Next Milestone:</strong> {nextMilestone} days
        </Text>
      </Card>

      <Section style={progressSection}>
        <Text style={progressLabel}>Progress to {nextMilestone}-day milestone</Text>
        <Section style={progressBar}>
          <Section
            style={{
              ...progressFill,
              width: `${Math.min((streakDays / nextMilestone) * 100, 100)}%`,
            }}
          />
        </Section>
        <Text style={progressText}>
          {streakDays} / {nextMilestone} days ({Math.round((streakDays / nextMilestone) * 100)}%)
        </Text>
      </Section>

      <Section style={shareSection}>
        <Text style={{ fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' as const }}>
          🎉 Share your achievement!
        </Text>
        <Section style={{ textAlign: 'center' as const }}>
          <Link
            href={`https://twitter.com/intent/tweet?text=I just hit a ${milestone}-day coding streak on @ProgressTracker! 🔥`}
            style={shareButton}
          >
            Share on Twitter
          </Link>
        </Section>
      </Section>

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/dashboard`} variant="success">
          Keep the Streak Going! 🚀
        </Button>
      </Section>

      <Text style={signoff}>You&apos;re on fire! Keep up the amazing work! 🔥</Text>
    </EmailLayout>
  );
};

const celebrationBanner = {
  background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  borderRadius: '12px',
  padding: '32px 20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};
const celebrationEmoji = { fontSize: '48px', margin: '0 0 8px' };
const celebrationNumber = {
  fontSize: '64px',
  fontWeight: 'bold',
  color: '#ffffff',
  margin: 0,
  lineHeight: 1,
  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
};
const celebrationTitle = { fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '8px 0 0' };
const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };
const progressSection = { margin: '24px 0' };
const progressLabel = { fontSize: '14px', color: '#6b7280', margin: '0 0 8px', textAlign: 'center' as const };
const progressBar = { backgroundColor: '#e5e7eb', borderRadius: '999px', height: '12px', overflow: 'hidden' };
const progressFill = { backgroundColor: '#f59e0b', height: '100%', borderRadius: '999px' };
const progressText = { fontSize: '14px', color: '#374151', margin: '8px 0 0', textAlign: 'center' as const };
const shareSection = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '20px', margin: '24px 0' };
const shareButton = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
};
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' };
const signoff = { fontSize: '16px', color: '#374151', margin: '24px 0 0', textAlign: 'center' as const, fontWeight: 'bold' };

export default StreakMilestoneEmail;