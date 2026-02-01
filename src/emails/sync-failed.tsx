// src/emails/sync-failed.tsx
import { Text, Section, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface SyncFailedProps {
  userName: string;
  platformName: string;
  platformIcon: string;
  failureReason: string;
  failedAt: string;
  consecutiveFailures: number;
  suggestedActions: string[];
}

export const SyncFailedEmail: React.FC<SyncFailedProps> = ({
  userName = 'there',
  platformName = 'Platform',
  platformIcon = '🔗',
  failureReason = 'Unknown error',
  failedAt = new Date().toISOString(),
  consecutiveFailures = 1,
  suggestedActions = [
    'Check if your API key or credentials are still valid',
    'Reconnect the platform in your settings',
    'Make sure the platform is not experiencing downtime',
  ],
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
  const isUrgent = consecutiveFailures >= 3;

  return (
    <EmailLayout preview={`⚠️ ${platformName} sync failed`}>
      <Section style={isUrgent ? urgentBanner : warningBanner}>
        <Text style={bannerEmoji}>{platformIcon}</Text>
        <Text style={bannerTitle}>{platformName} Sync Failed</Text>
        {isUrgent && (
          <Text style={bannerSubtitle}>{consecutiveFailures} consecutive failures</Text>
        )}
      </Section>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        We encountered an issue while syncing your {platformName} data.
        {isUrgent && ' This has happened multiple times and requires your attention.'}
      </Text>

      <Card variant="danger" title="Error Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Platform:</strong> {platformName}
          <br />
          <strong>Error:</strong> {failureReason}
          <br />
          <strong>Time:</strong> {new Date(failedAt).toLocaleString()}
          <br />
          <strong>Consecutive Failures:</strong> {consecutiveFailures}
        </Text>
      </Card>

      <Card variant="warning" title="⚠️ Impact">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          While sync is failing, your {platformName} activities won&apos;t be reflected in your
          dashboard. This may affect your streak and statistics.
        </Text>
      </Card>

      <Text style={paragraph}>
        <strong>How to fix this:</strong>
      </Text>
      <ul style={actionsList}>
        {suggestedActions.map((action, index) => (
          <li key={index} style={{ marginBottom: '8px', color: '#374151' }}>
            {action}
          </li>
        ))}
      </ul>

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/settings/integrations`} variant="primary">
          Fix Integration
        </Button>
      </Section>

      <Card variant="info" title="Need Help?">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          If you&apos;re still having issues, check our{' '}
          <Link href={`${baseUrl}/docs/troubleshooting`} style={link}>
            troubleshooting guide
          </Link>{' '}
          or{' '}
          <Link href={`${baseUrl}/support`} style={link}>
            contact support
          </Link>
          .
        </Text>
      </Card>

      <Text style={smallText}>
        We&apos;ll automatically retry syncing in the background.
      </Text>
    </EmailLayout>
  );
};

const urgentBanner = {
  backgroundColor: '#fef2f2',
  border: '2px solid #ef4444',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};
const warningBanner = {
  backgroundColor: '#fffbeb',
  border: '2px solid #f59e0b',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};
const bannerEmoji = { fontSize: '36px', margin: '0 0 8px' };
const bannerTitle = { fontSize: '22px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 };
const bannerSubtitle = { fontSize: '14px', color: '#ef4444', margin: '4px 0 0', fontWeight: 'bold' };
const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };
const actionsList = { margin: '0 0 16px', paddingLeft: '20px' };
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' };
const smallText = { fontSize: '14px', color: '#6b7280', margin: '24px 0 0' };
const link = { color: '#3b82f6', textDecoration: 'none' };

export default SyncFailedEmail;