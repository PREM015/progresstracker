// src/emails/payment-failed.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface PaymentFailedProps {
  userName: string;
  planName: string;
  amount: string;
  failedAt: string;
  failureReason: string;
  retryDate?: string;
  gracePeriodEnds: string;
  paymentMethodLast4: string;
}

export const PaymentFailedEmail: React.FC<PaymentFailedProps> = ({
  userName = 'there',
  planName = 'Pro',
  amount = '$9.99',
  failedAt = new Date().toISOString(),
  failureReason = 'Card declined',
  retryDate,
  gracePeriodEnds = new Date().toISOString(),
  paymentMethodLast4 = '4242',
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview="⚠️ Payment failed - Action required">
      <Section style={alertBanner}>
        <Text style={{ fontSize: '36px', margin: '0 0 8px' }}>⚠️</Text>
        <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>
          Payment Failed
        </Text>
      </Section>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        We were unable to process your payment for ProgressTracker {planName}. Please update your
        payment information to avoid losing access.
      </Text>

      <Card variant="danger" title="Payment Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Amount:</strong> {amount}
          <br />
          <strong>Card:</strong> •••• {paymentMethodLast4}
          <br />
          <strong>Failed On:</strong> {new Date(failedAt).toLocaleDateString()}
          <br />
          <strong>Reason:</strong> {failureReason}
        </Text>
      </Card>

      <Card variant="warning" title="⏰ Grace Period">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          You have until <strong>{new Date(gracePeriodEnds).toLocaleDateString()}</strong> to update
          your payment method and keep your {planName} subscription active.
          {retryDate && (
            <>
              <br />
              <br />
              We&apos;ll automatically retry on{' '}
              <strong>{new Date(retryDate).toLocaleDateString()}</strong>.
            </>
          )}
        </Text>
      </Card>

      <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
        <Button href={`${baseUrl}/settings/billing`} variant="primary">
          Update Payment Method
        </Button>
      </Section>
    </EmailLayout>
  );
};

const alertBanner = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};
const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };

export default PaymentFailedEmail;