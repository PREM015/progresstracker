// src/emails/report-generated.tsx
// Email sent when a report is ready

import {
  Text,
  Section,
  Link,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

interface ReportStats {
  problemsSolved: number;
  commits: number;
  timeSpent: number; // in minutes
  streak: number;
  goalsCompleted: number;
  achievementsUnlocked: number;
}

interface ReportGeneratedEmailProps {
  userName: string;
  reportType: 'weekly' | 'monthly' | 'yearly' | 'custom';
  reportId: string;
  periodStart: string;
  periodEnd: string;
  stats: ReportStats;
  downloadUrl: string;
  expiresAt: string;
  highlights?: string[];
}

export const ReportGeneratedEmail: React.FC<ReportGeneratedEmailProps> = ({
  userName = 'User',
  reportType = 'weekly',
  reportId = '',
  periodStart = new Date().toISOString(),
  periodEnd = new Date().toISOString(),
  stats = {
    problemsSolved: 0,
    commits: 0,
    timeSpent: 0,
    streak: 0,
    goalsCompleted: 0,
    achievementsUnlocked: 0,
  },
  downloadUrl = '#',
  expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  highlights = [],
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
  const reportTitle = reportType.charAt(0).toUpperCase() + reportType.slice(1);

  return (
    <EmailLayout preview={`Your ${reportTitle} Report is Ready 📊`}>
      <Text style={heading}>📊 Your {reportTitle} Report is Ready!</Text>
      
      <Text style={paragraph}>
        Hi {userName},
      </Text>
      
      <Text style={paragraph}>
        Great news! Your {reportType} progress report for{' '}
        <strong>{new Date(periodStart).toLocaleDateString()}</strong> to{' '}
        <strong>{new Date(periodEnd).toLocaleDateString()}</strong> is ready to view.
      </Text>

      {/* Stats Overview */}
      <Section style={statsGrid}>
        <Section style={statCard}>
          <Text style={statValue}>{stats.problemsSolved}</Text>
          <Text style={statLabel}>Problems Solved</Text>
        </Section>
        <Section style={statCard}>
          <Text style={statValue}>{stats.commits}</Text>
          <Text style={statLabel}>Commits</Text>
        </Section>
        <Section style={statCard}>
          <Text style={statValue}>{Math.round(stats.timeSpent / 60)}h</Text>
          <Text style={statLabel}>Time Spent</Text>
        </Section>
        <Section style={statCard}>
          <Text style={statValue}>{stats.streak}🔥</Text>
          <Text style={statLabel}>Current Streak</Text>
        </Section>
      </Section>

      {/* Highlights */}
      {highlights.length > 0 && (
        <Card variant="success" title="🎯 Highlights">
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {highlights.map((highlight, index) => (
              <li key={index} style={{ marginBottom: '8px', color: '#374151' }}>
                {highlight}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Achievements */}
      {(stats.goalsCompleted > 0 || stats.achievementsUnlocked > 0) && (
        <Card variant="info" title="🏆 Achievements This Period">
          <Text style={{ margin: 0, fontSize: '14px' }}>
            {stats.goalsCompleted > 0 && (
              <span>✅ {stats.goalsCompleted} goal{stats.goalsCompleted > 1 ? 's' : ''} completed<br /></span>
            )}
            {stats.achievementsUnlocked > 0 && (
              <span>🏅 {stats.achievementsUnlocked} achievement{stats.achievementsUnlocked > 1 ? 's' : ''} unlocked</span>
            )}
          </Text>
        </Card>
      )}

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/reports/${reportId}`} variant="primary">
          View Full Report
        </Button>
        <Text style={{ margin: '8px 0 0', fontSize: '14px' }}>
          <Link href={downloadUrl} style={link}>
            Download PDF
          </Link>
        </Text>
      </Section>

      <Card variant="warning">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          ⏰ This download link expires on{' '}
          <strong>{new Date(expiresAt).toLocaleDateString()}</strong>
        </Text>
      </Card>

      <Text style={paragraph}>
        Keep up the amazing work! Consistency is the key to success. 💪
      </Text>

      <Text style={smallText}>
        You received this email because you have report notifications enabled.{' '}
        <Link href={`${baseUrl}/settings/notifications`} style={link}>
          Manage preferences
        </Link>
      </Text>
    </EmailLayout>
  );
};

// Styles
const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 24px',
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
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
};

const statValue = {
  fontSize: '28px',
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

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const smallText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '24px 0 0',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
};

export default ReportGeneratedEmail;