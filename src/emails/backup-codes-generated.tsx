// src/emails/backup-codes-generated.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

interface BackupCodesGeneratedEmailProps {
  userName?: string;
  generatedAt?: string;
  codesCount?: number;
  ipAddress?: string;
}

export const BackupCodesGeneratedEmail: React.FC<BackupCodesGeneratedEmailProps> = ({
  userName = 'there',
  generatedAt = new Date().toISOString(),
  codesCount = 10,
  ipAddress = 'Unknown',
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview="New backup codes generated for your account">
      <Section style={successBanner}>
        <Text style={{ fontSize: '36px', margin: '0 0 8px' }}>🔐</Text>
        <Text style={{ fontSize: '22px', fontWeight: 'bold', color: '#065f46', margin: 0 }}>
          Backup Codes Generated
        </Text>
      </Section>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        New backup codes have been generated for your ProgressTracker account. Any previous backup
        codes are now invalid.
      </Text>

      <Card variant="success" title="Generation Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Codes Generated:</strong> {codesCount}
          <br />
          <strong>Generated At:</strong> {new Date(generatedAt).toLocaleString()}
          <br />
          <strong>IP Address:</strong> {ipAddress}
        </Text>
      </Card>

      <Card variant="warning" title="⚠️ Important">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          • Store these codes in a safe, secure location
          <br />
          • Each code can only be used once
          <br />
          • Use these codes if you lose access to your authenticator app
          <br />• Previous backup codes are no longer valid
        </Text>
      </Card>

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/settings/security`} variant="primary">
          View Security Settings
        </Button>
      </Section>

      <Card variant="danger" title="Wasn't You?">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          If you didn&apos;t generate new backup codes, your account may be compromised. Please secure
          your account immediately by changing your password and reviewing your security settings.
        </Text>
      </Card>

      <Text style={smallText}>
        This is an automated security notification from ProgressTracker.
      </Text>
    </EmailLayout>
  );
};

const successBanner = {
  backgroundColor: '#ecfdf5',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
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

const smallText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '24px 0 0',
};

export default BackupCodesGeneratedEmail;