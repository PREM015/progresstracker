// src/emails/invoice-paid.tsx
import { Text, Section, Hr, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface InvoiceItem {
  description: string;
  amount: string;
}

export interface InvoicePaidProps {
  userName: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  paymentMethod: string;
  paymentMethodLast4: string;
  planName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  items: InvoiceItem[];
  invoiceUrl: string;
  nextBillingDate: string;
}

export const InvoicePaidEmail: React.FC<InvoicePaidProps> = ({
  userName = 'there',
  invoiceNumber = 'INV-000000',
  invoiceDate = new Date().toISOString(),
  amount = '$9.99',
  paymentMethod = 'Visa',
  paymentMethodLast4 = '4242',
  planName = 'Pro',
  billingPeriodStart = new Date().toISOString(),
  billingPeriodEnd = new Date().toISOString(),
  items = [],
  invoiceUrl = '#',
  nextBillingDate = new Date().toISOString(),
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview={`Receipt for your payment - ${invoiceNumber}`}>
      <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 24px' }}>
        🧾 Payment Receipt
      </Text>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Thank you for your payment! Here&apos;s your receipt for your ProgressTracker {planName}{' '}
        subscription.
      </Text>

      <Card variant="success" title="Payment Successful">
        <Section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 }}>
            {invoiceNumber}
          </Text>
          <Text style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            {new Date(invoiceDate).toLocaleDateString()}
          </Text>
        </Section>
      </Card>

      <Section style={invoiceTable}>
        <Section style={invoiceRow}>
          <Text style={invoiceLabel}>Billing Period</Text>
          <Text style={invoiceValue}>
            {new Date(billingPeriodStart).toLocaleDateString()} -{' '}
            {new Date(billingPeriodEnd).toLocaleDateString()}
          </Text>
        </Section>
        <Hr style={{ borderColor: '#e5e7eb', margin: '8px 0' }} />
        {items.map((item, index) => (
          <Section key={index} style={invoiceRow}>
            <Text style={invoiceLabel}>{item.description}</Text>
            <Text style={invoiceValue}>{item.amount}</Text>
          </Section>
        ))}
        <Hr style={{ borderColor: '#e5e7eb', margin: '8px 0' }} />
        <Section style={invoiceRow}>
          <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 }}>
            Total Paid
          </Text>
          <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', margin: 0 }}>
            {amount}
          </Text>
        </Section>
      </Section>

      <Card variant="info" title="Payment Method">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          {paymentMethod} ending in {paymentMethodLast4}
        </Text>
      </Card>

      <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
        <Button href={invoiceUrl} variant="primary">
          Download Invoice PDF
        </Button>
      </Section>

      <Card variant="default">
        <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
          📅 Your next billing date is{' '}
          <strong>{new Date(nextBillingDate).toLocaleDateString()}</strong>
        </Text>
      </Card>

      <Text style={smallText}>
        View all invoices in your{' '}
        <Link href={`${baseUrl}/settings/billing`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
          billing settings
        </Link>
        .
      </Text>
    </EmailLayout>
  );
};

const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };
const invoiceTable = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', margin: '16px 0' };
const invoiceRow = { display: 'flex', justifyContent: 'space-between', padding: '8px 0' };
const invoiceLabel = { fontSize: '14px', color: '#6b7280', margin: 0 };
const invoiceValue = { fontSize: '14px', color: '#374151', margin: 0 };
const smallText = { fontSize: '14px', color: '#6b7280', margin: '24px 0 0', textAlign: 'center' as const };

export default InvoicePaidEmail;