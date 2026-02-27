// src/emails/subscription-created.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface SubscriptionCreatedProps {
  userName: string;
  planName: string;
  planPrice: string;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  nextBillingDate: string;
  trialEnds?: string;
}

export const SubscriptionCreatedEmail: React.FC<SubscriptionCreatedProps> = ({
  userName = 'there',
  planName = 'Pro',
  planPrice = '$9.99',
  billingPeriod = 'monthly',
  features = [],
  nextBillingDate = new Date().toISOString(),
  trialEnds,
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview={`Welcome to ProgressTracker ${planName}!`}>
      <Section style={successBanner}>
        <Text style={{ fontSize: '48px', margin: '0 0 8px' }}>🎉</Text>
        <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
          Welcome to {planName}!
        </Text>
      </Section>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Thank you for subscribing to ProgressTracker {planName}! Your subscription is now active.
      </Text>

      <Card variant="success" title="Subscription Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Plan:</strong> {planName}
          <br />
          <strong>Price:</strong> {planPrice}/{billingPeriod === 'yearly' ? 'year' : 'month'}
          <br />
          {trialEnds && (
            <>
              <strong>Trial Ends:</strong> {new Date(trialEnds).toLocaleDateString()}
              <br />
            </>
          )}
          <strong>Next Billing:</strong> {new Date(nextBillingDate).toLocaleDateString()}
        </Text>
      </Card>

      {features.length > 0 && (
        <Card variant="info" title={`✨ Your ${planName} Features`}>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {features.map((feature, index) => (
              <li key={index} style={{ marginBottom: '8px', color: '#374151' }}>
                {feature}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
        <Button href={`${baseUrl}/dashboard`} variant="primary">
          Explore {planName} Features
        </Button>
      </Section>
    </EmailLayout>
  );
};

const successBanner = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
  borderRadius: '12px',
  padding: '32px 20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};
const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };

export default SubscriptionCreatedEmail;