// src/emails/weekly-report.tsx (continued)
// Complete the weekly report email

import {
  Text,
  Section,
  Hr,
  Link,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

interface WeeklyStats {
  problemsSolved: number;
  problemsChange: number;
  commits: number;
  commitsChange: number;
  timeSpent: number;
  timeChange: number;
  currentStreak: number;
  longestStreak: number;
  goalsCompleted: number;
  goalsTotal: number;
  rank?: number;
  rankChange?: number;
}

interface PlatformStat {
  name: string;
  icon: string;
  value: number;
  label: string;
}

interface WeeklyReportEmailProps {
  userName: string;
  weekNumber: number;
  year: number;
  stats: WeeklyStats;
  platformStats: PlatformStat[];
  topAchievement?: string;
  motivationalQuote?: string;
}

export const WeeklyReportEmail: React.FC<WeeklyReportEmailProps> = ({
  userName = 'User',
  weekNumber = 1,
  year = new Date().getFullYear(),
  stats = {
    problemsSolved: 0,
    problemsChange: 0,
    commits: 0,
    commitsChange: 0,
    timeSpent: 0,
    timeChange: 0,
    currentStreak: 0,
    longestStreak: 0,
    goalsCompleted: 0,
    goalsTotal: 0,
  },
  platformStats = [],
  topAchievement = '',
  motivationalQuote = "The only way to do great work is to love what you do.",
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  const formatChange = (change: number) => {
    if (change > 0) return `+${change}`;
    return change.toString();
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return '#10b981';
    if (change < 0) return '#ef4444';
    return '#6b7280';
  };

  return (
    <EmailLayout preview={`📊 Your Week ${weekNumber} Progress Report`}>
      <Text style={heading}>📊 Weekly Progress Report</Text>
      <Text style={subheading}>Week {weekNumber}, {year}</Text>
      
      <Text style={paragraph}>
        Hi {userName},
      </Text>
      
      <Text style={paragraph}>
        Here&apos;s your coding progress summary for this week. 
        {stats.problemsSolved > 0 || stats.commits > 0 
          ? " Great job staying active!" 
          : " Let's get back on track next week!"}
      </Text>

      {/* Main Stats Grid */}
      <Section style={statsGrid}>
        <Section style={statCard}>
          <Text style={statValue}>{stats.problemsSolved}</Text>
          <Text style={statLabel}>Problems Solved</Text>
          <Text style={{ ...statChange, color: getChangeColor(stats.problemsChange) }}>
            {formatChange(stats.problemsChange)} vs last week
          </Text>
        </Section>
        <Section style={statCard}>
          <Text style={statValue}>{stats.commits}</Text>
          <Text style={statLabel}>Commits</Text>
          <Text style={{ ...statChange, color: getChangeColor(stats.commitsChange) }}>
            {formatChange(stats.commitsChange)} vs last week
          </Text>
        </Section>
        <Section style={statCard}>
          <Text style={statValue}>{Math.round(stats.timeSpent / 60)}h</Text>
          <Text style={statLabel}>Time Spent</Text>
          <Text style={{ ...statChange, color: getChangeColor(stats.timeChange) }}>
            {formatChange(Math.round(stats.timeChange / 60))}h vs last week
          </Text>
        </Section>
        <Section style={statCard}>
          <Text style={statValue}>{stats.currentStreak}🔥</Text>
          <Text style={statLabel}>Current Streak</Text>
          <Text style={statChange}>Best: {stats.longestStreak} days</Text>
        </Section>
      </Section>

      {/* Goals Progress */}
      <Card variant="info" title="🎯 Goals Progress">
        <Section style={goalsProgress}>
          <Section style={progressBar}>
            <Section style={{
              ...progressFill,
              width: `${stats.goalsTotal > 0 ? (stats.goalsCompleted / stats.goalsTotal) * 100 : 0}%`,
            }} />
          </Section>
          <Text style={goalsText}>
            {stats.goalsCompleted} of {stats.goalsTotal} goals completed
          </Text>
        </Section>
      </Card>

      {/* Platform Breakdown */}
      {platformStats.length > 0 && (
        <>
          <Hr style={divider} />
          <Text style={sectionTitle}>Platform Breakdown</Text>
          <Section style={platformGrid}>
            {platformStats.map((platform, index) => (
              <Section key={index} style={platformCard}>
                <Text style={platformIcon}>{platform.icon}</Text>
                <Text style={platformName}>{platform.name}</Text>
                <Text style={platformValue}>{platform.value}</Text>
                <Text style={platformLabel}>{platform.label}</Text>
              </Section>
            ))}
          </Section>
        </>
      )}

      {/* Top Achievement */}
      {topAchievement && (
        <Card variant="success" title="🏆 Top Achievement This Week">
          <Text style={{ margin: 0, fontSize: '16px', textAlign: 'center' as const }}>
            {topAchievement}
          </Text>
        </Card>
      )}

      {/* Ranking */}
      {stats.rank && (
        <Card variant="default">
          <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
            📈 You&apos;re ranked <strong>#{stats.rank}</strong> globally
            {stats.rankChange && (
              <span style={{ color: getChangeColor(-stats.rankChange) }}>
                {' '}({formatChange(-stats.rankChange)} positions)
              </span>
            )}
          </Text>
        </Card>
      )}

      <Hr style={divider} />

      {/* Motivational Quote */}
      <Section style={quoteSection}>
        <Text style={quoteText}>&ldquo;{motivationalQuote}&rdquo;</Text>
      </Section>

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/dashboard`} variant="primary">
          View Full Dashboard
        </Button>
      </Section>

      <Text style={smallText}>
        You&apos;re receiving this weekly report because you have email reports enabled.{' '}
        <Link href={`${baseUrl}/settings/notifications`} style={link}>
          Manage preferences
        </Link>
      </Text>
    </EmailLayout>
  );
};

// Styles
const heading = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0',
  textAlign: 'center' as const,
};

const subheading = {
  fontSize: '16px',
  color: '#6b7280',
  margin: '4px 0 24px',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
};

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '12px',
  margin: '24px 0',
};

const statCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
};

const statValue = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#3b82f6',
  margin: '0',
};

const statLabel = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '4px 0 0',
  textTransform: 'uppercase' as const,
};

const statChange = {
  fontSize: '11px',
  margin: '4px 0 0',
};

const goalsProgress = {
  textAlign: 'center' as const,
};

const progressBar = {
  backgroundColor: '#e5e7eb',
  borderRadius: '999px',
  height: '8px',
  overflow: 'hidden',
  marginBottom: '8px',
};

const progressFill = {
  backgroundColor: '#10b981',
  height: '100%',
  borderRadius: '999px',
  transition: 'width 0.3s ease',
};

const goalsText = {
  fontSize: '14px',
  color: '#374151',
  margin: 0,
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const sectionTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 16px',
};

const platformGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
};

const platformCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '12px',
  textAlign: 'center' as const,
};

const platformIcon = {
  fontSize: '24px',
  margin: '0 0 4px',
};

const platformName = {
  fontSize: '11px',
  color: '#6b7280',
  margin: '0 0 4px',
  fontWeight: 'bold',
};

const platformValue = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: 0,
};

const platformLabel = {
  fontSize: '10px',
  color: '#9ca3af',
  margin: 0,
};

const quoteSection = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const quoteText = {
  fontSize: '16px',
  fontStyle: 'italic',
  color: '#4b5563',
  margin: 0,
  textAlign: 'center' as const,
  lineHeight: '24px',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const smallText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '24px 0 0',
  textAlign: 'center' as const,
};

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
};

export default WeeklyReportEmail;