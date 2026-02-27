// src/emails/goal-completed.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface GoalCompletedProps {
  userName: string;
  goalTitle: string;
  goalTarget: number;
  goalUnit: string;
  completedAt: string;
  daysToComplete: number;
  xpEarned: number;
  achievementUnlocked?: string;
  nextSuggestedGoal?: string;
}

export const GoalCompletedEmail: React.FC<GoalCompletedProps> = ({
  userName = 'there',
  goalTitle = 'Goal',
  goalTarget = 0,
  goalUnit = 'items',
  completedAt = new Date().toISOString(),
  daysToComplete = 0,
  xpEarned = 0,
  achievementUnlocked = '',
  nextSuggestedGoal = '',
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview={`🎉 Goal Completed: ${goalTitle}`}>
      <Section style={celebrationBanner}>
        <Text style={celebrationEmoji}>🎉</Text>
        <Text style={celebrationTitle}>Goal Completed!</Text>
      </Section>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Congratulations! You&apos;ve successfully completed your goal. This is a fantastic
        achievement!
      </Text>

      <Card variant="success" title={goalTitle}>
        <Section style={goalStats}>
          <Section style={goalStatItem}>
            <Text style={goalStatValue}>✅</Text>
            <Text style={goalStatLabel}>Completed</Text>
          </Section>
          <Section style={goalStatItem}>
            <Text style={goalStatValue}>{goalTarget}</Text>
            <Text style={goalStatLabel}>{goalUnit}</Text>
          </Section>
          <Section style={goalStatItem}>
            <Text style={goalStatValue}>{daysToComplete}</Text>
            <Text style={goalStatLabel}>Days</Text>
          </Section>
          <Section style={goalStatItem}>
            <Text style={goalStatValue}>+{xpEarned}</Text>
            <Text style={goalStatLabel}>XP Earned</Text>
          </Section>
        </Section>
      </Card>

      {achievementUnlocked && (
        <Card variant="info" title="🏆 Achievement Unlocked!">
          <Text style={{ margin: 0, fontSize: '16px', textAlign: 'center' as const }}>
            {achievementUnlocked}
          </Text>
        </Card>
      )}

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/goals/create`} variant="primary">
          Set a New Goal
        </Button>
      </Section>

      {nextSuggestedGoal && (
        <Card variant="default" title="💡 Suggested Next Goal">
          <Text style={{ margin: 0, fontSize: '14px' }}>{nextSuggestedGoal}</Text>
        </Card>
      )}

      <Text style={paragraph}>
        Every goal you complete brings you one step closer to mastery. Keep pushing forward! 💪
      </Text>

      <Text style={smallText}>
        Completed on {new Date(completedAt).toLocaleDateString()}
      </Text>
    </EmailLayout>
  );
};

const celebrationBanner = {
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  borderRadius: '12px',
  padding: '32px 20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};
const celebrationEmoji = { fontSize: '48px', margin: '0 0 8px' };
const celebrationTitle = { fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: 0 };
const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };
const goalStats = { display: 'flex', justifyContent: 'space-around' };
const goalStatItem = { textAlign: 'center' as const };
const goalStatValue = { fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 };
const goalStatLabel = { fontSize: '11px', color: '#6b7280', margin: '4px 0 0', textTransform: 'uppercase' as const };
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' };
const smallText = { fontSize: '14px', color: '#6b7280', margin: '24px 0 0', textAlign: 'center' as const };

export default GoalCompletedEmail;