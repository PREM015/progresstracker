// src/emails/monthly-report.tsx
import { Text, Section, Hr, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface MonthlyReportStats {
  problemsSolved: number;
  commits: number;
  timeSpent: number;
  activeDays: number;
  totalDays: number;
  longestStreak: number;
  goalsCompleted: number;
  achievementsUnlocked: number;
  topPlatform: string;
  topLanguage?: string;
}

export interface WeeklyBreakdown {
  week: number;
  problems: number;
  commits: number;
}

export interface MonthlyReportProps {
  userName: string;
  month: string;
  year: number;
  stats: MonthlyReportStats;
  weeklyBreakdown: WeeklyBreakdown[];
  improvements?: string[];
  downloadUrl: string;
}

export const MonthlyReportEmail: React.FC<MonthlyReportProps> = ({
  userName = 'there',
  month = 'January',
  year = new Date().getFullYear(),
  stats = {
    problemsSolved: 0,
    commits: 0,
    timeSpent: 0,
    activeDays: 0,
    totalDays: 30,
    longestStreak: 0,
    goalsCompleted: 0,
    achievementsUnlocked: 0,
    topPlatform: 'GitHub',
  },
  weeklyBreakdown = [],
  improvements = [],
  downloadUrl = '#',
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
  const consistencyRate = Math.round((stats.activeDays / stats.totalDays) * 100);

  return (
    <EmailLayout preview={`📊 Your ${month} ${year} Progress Report`}>
      <Text style={heading}>📊 Monthly Progress Report</Text>
      <Text style={subheading}>
        {month} {year}
      </Text>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Here&apos;s your comprehensive progress report for {month}. Let&apos;s see how you did! 🚀
      </Text>

      {/* Overview Stats */}
      <Section style={overviewGrid}>
        <Section style={overviewCard}>
          <Text style={overviewValue}>{stats.problemsSolved}</Text>
          <Text style={overviewLabel}>Problems Solved</Text>
        </Section>
        <Section style={overviewCard}>
          <Text style={overviewValue}>{stats.commits}</Text>
          <Text style={overviewLabel}>Commits</Text>
        </Section>
        <Section style={overviewCard}>
          <Text style={overviewValue}>{Math.round(stats.timeSpent / 60)}h</Text>
          <Text style={overviewLabel}>Time Coding</Text>
          <Text style={overviewLabel}> your weekly breakdown{weeklyBreakdown.length > 0 && ':'}</Text>

        </Section>
        <Section style={overviewCard}>
          <Text style={overviewValue}>{consistencyRate}%</Text>
          <Text style={overviewLabel}>Consistency</Text>
        </Section>
      </Section>

      {/* Consistency */}
      <Card variant="info" title="📅 Active Days">
        <Section style={{ textAlign: 'center' as const }}>
          <Section style={consistencyBar}>
            <Section style={{ ...consistencyFill, width: `${consistencyRate}%` }} />
          </Section>
          <Text style={consistencyText}>
            {stats.activeDays} out of {stats.totalDays} days active
          </Text>
        </Section>
      </Card>

      <Hr style={divider} />

      {/* Key Achievements */}
      <Text style={sectionTitle}>🏆 Key Achievements</Text>
      <Section style={achievementsGrid}>
        <Section style={achievementItem}>
          <Text style={achievementValue}>{stats.longestStreak} days</Text>
          <Text style={achievementLabel}>Longest Streak</Text>
        </Section>
        <Section style={achievementItem}>
          <Text style={achievementValue}>{stats.goalsCompleted}</Text>
          <Text style={achievementLabel}>Goals Completed</Text>
        </Section>
        <Section style={achievementItem}>
          <Text style={achievementValue}>{stats.achievementsUnlocked}</Text>
          <Text style={achievementLabel}>Achievements</Text>
        </Section>
        <Section style={achievementItem}>
          <Text style={achievementValue}>{stats.topPlatform}</Text>
          <Text style={achievementLabel}>Top Platform</Text>
        </Section>
      </Section>

      {/* Improvements */}
      {improvements.length > 0 && (
        <>
          <Hr style={divider} />
          <Card variant="warning" title="💡 Areas to Improve">
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {improvements.map((item, index) => (
                <li key={index} style={{ marginBottom: '8px', color: '#374151' }}>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/reports`} variant="primary">
          View Full Report
        </Button>
        <Text style={{ margin: '12px 0 0' }}>
          <Link href={downloadUrl} style={link}>
            Download PDF Report
          </Link>
        </Text>
      </Section>

      <Text style={paragraph}>
        Keep up the great work! Consistency is the key to improvement. See you in next month&apos;s
        report! 💪
      </Text>

      <Text style={smallText}>
        You&apos;re receiving this monthly report based on your preferences.{' '}
        <Link href={`${baseUrl}/settings/notifications`} style={link}>
          Manage preferences
        </Link>
      </Text>
    </EmailLayout>
  );
};

const heading = { fontSize: '28px', fontWeight: 'bold', color: '#1a1a1a', margin: '0', textAlign: 'center' as const };
const subheading = { fontSize: '18px', color: '#6b7280', margin: '4px 0 24px', textAlign: 'center' as const };
const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };
const overviewGrid = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', margin: '24px 0' };
const overviewCard = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
};
const overviewValue = { fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: '0' };
const overviewLabel = { fontSize: '11px', color: '#bfdbfe', margin: '4px 0 0', textTransform: 'uppercase' as const };
const consistencyBar = { backgroundColor: '#e5e7eb', borderRadius: '999px', height: '12px', overflow: 'hidden', marginBottom: '8px' };
const consistencyFill = { backgroundColor: '#10b981', height: '100%', borderRadius: '999px' };
const consistencyText = { fontSize: '14px', color: '#374151', margin: 0 };
const divider = { borderColor: '#e5e7eb', margin: '24px 0' };
const sectionTitle = { fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 16px' };
const achievementsGrid = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' };
const achievementItem = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '12px', textAlign: 'center' as const };
const achievementValue = { fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 };
const achievementLabel = { fontSize: '11px', color: '#6b7280', margin: '4px 0 0' };
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' };
const smallText = { fontSize: '14px', color: '#6b7280', margin: '24px 0 0', textAlign: 'center' as const };
const link = { color: '#3b82f6', textDecoration: 'none' };

export default MonthlyReportEmail;