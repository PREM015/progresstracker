// src/emails/goal-reminder.tsx
import { Text, Section, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface GoalReminderGoal {
  id: string;
  title: string;
  progress: number;
  target: number;
  unit: string;
  deadline: string;
  daysRemaining: number;
}

export interface GoalReminderProps {
  userName: string;
  goals: GoalReminderGoal[];
  reminderType: 'daily' | 'weekly' | 'deadline';
}

export const GoalReminderEmail: React.FC<GoalReminderProps> = ({
  userName = 'there',
  goals = [],
  reminderType = 'daily',
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  const getReminderTitle = () => {
    switch (reminderType) {
      case 'daily':
        return '📅 Daily Goal Check-in';
      case 'weekly':
        return '📊 Weekly Goal Update';
      case 'deadline':
        return '⏰ Goal Deadline Approaching!';
      default:
        return '🎯 Goal Reminder';
    }
  };

  return (
    <EmailLayout preview={getReminderTitle()}>
      <Text style={heading}>{getReminderTitle()}</Text>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        {reminderType === 'deadline'
          ? "Some of your goals have upcoming deadlines. Here's your progress:"
          : "Here's a quick update on your active goals:"}
      </Text>

      {goals.map((goal) => (
        <Card
          key={goal.id}
          variant={goal.daysRemaining <= 3 ? 'danger' : goal.daysRemaining <= 7 ? 'warning' : 'default'}
        >
          <Text style={goalTitle}>{goal.title}</Text>
          <Section style={progressContainer}>
            <Section style={progressBar}>
              <Section
                style={{
                  ...progressFill,
                  width: `${Math.min((goal.progress / goal.target) * 100, 100)}%`,
                }}
              />
            </Section>
            <Text style={progressText}>
              {goal.progress} / {goal.target} {goal.unit} (
              {Math.round((goal.progress / goal.target) * 100)}%)
            </Text>
          </Section>
          <Text style={deadlineText}>
            {goal.daysRemaining <= 0
              ? '🚨 Deadline passed!'
              : goal.daysRemaining === 1
              ? '⏰ 1 day remaining'
              : `📅 ${goal.daysRemaining} days remaining`}
          </Text>
        </Card>
      ))}

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/goals`} variant="primary">
          View All Goals
        </Button>
      </Section>

      <Card variant="info" title="💡 Quick Tips">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          • Break large goals into smaller daily tasks
          <br />
          • Log progress regularly to stay motivated
          <br />
          • Adjust deadlines if needed - it&apos;s okay to be flexible
          <br />• Celebrate small wins along the way
        </Text>
      </Card>

      <Text style={smallText}>
        You&apos;re receiving this reminder based on your notification preferences.{' '}
        <Link href={`${baseUrl}/settings/notifications`} style={link}>
          Manage preferences
        </Link>
      </Text>
    </EmailLayout>
  );
};

const heading = { fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 24px' };
const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };
const goalTitle = { fontSize: '16px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 12px' };
const progressContainer = { margin: '0 0 8px' };
const progressBar = {
  backgroundColor: '#e5e7eb',
  borderRadius: '999px',
  height: '8px',
  overflow: 'hidden',
  marginBottom: '4px',
};
const progressFill = { backgroundColor: '#3b82f6', height: '100%', borderRadius: '999px' };
const progressText = { fontSize: '12px', color: '#6b7280', margin: 0 };
const deadlineText = { fontSize: '12px', color: '#6b7280', margin: '8px 0 0', fontWeight: 'bold' };
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' };
const smallText = { fontSize: '14px', color: '#6b7280', margin: '24px 0 0' };
const link = { color: '#3b82f6', textDecoration: 'none' };

export default GoalReminderEmail;