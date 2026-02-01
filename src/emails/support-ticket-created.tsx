// src/emails/support-ticket-created.tsx
// Email sent when a support ticket is created

import {
  Text,
  Section,
  
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

interface SupportTicketCreatedEmailProps {
  userName: string;
  ticketNumber: string;
  ticketId: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedResponseTime: string;
}

export const SupportTicketCreatedEmail: React.FC<SupportTicketCreatedEmailProps> = ({
  userName = 'User',
  ticketNumber = 'TKT-000000',
  ticketId = '',
  subject = 'Support Request',
  category = 'General',
  priority = 'medium',
  description = '',
  expectedResponseTime = '24 hours',
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  const priorityColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#7c3aed',
  };

  const priorityEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🔴',
    critical: '🚨',
  };

  return (
    <EmailLayout preview={`Support Ticket Created: ${ticketNumber}`}>
      <Text style={heading}>🎫 Support Ticket Created</Text>
      
      <Text style={paragraph}>
        Hi {userName},
      </Text>
      
      <Text style={paragraph}>
        Thank you for contacting ProgressTracker support. We&apos;ve received your request 
        and our team will get back to you as soon as possible.
      </Text>

      <Card variant="info" title="Ticket Details">
        <Section style={ticketDetails}>
          <Text style={detailRow}>
            <strong>Ticket Number:</strong>{' '}
           <Text style={ticketCode}>{ticketNumber}</Text>

          </Text>
          <Text style={detailRow}>
            <strong>Subject:</strong> {subject}
          </Text>
          <Text style={detailRow}>
            <strong>Category:</strong> {category}
          </Text>
          <Text style={detailRow}>
            <strong>Priority:</strong>{' '}
            <span style={{ color: priorityColors[priority] }}>
              {priorityEmoji[priority]} {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </span>
          </Text>
        </Section>
      </Card>

      {description && (
        <Section style={descriptionSection}>
          <Text style={{ fontWeight: 'bold', marginBottom: '8px' }}>Your Message:</Text>
          <Text style={descriptionText}>{description}</Text>
        </Section>
      )}

      <Card variant="default">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          ⏱️ <strong>Expected Response Time:</strong> Within {expectedResponseTime}
        </Text>
      </Card>

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/support/tickets/${ticketId}`} variant="primary">
          View Ticket
        </Button>
      </Section>

      <Text style={paragraph}>
        <strong>What happens next?</strong>
      </Text>
      <Text style={paragraph}>
        1. Our support team will review your request<br />
        2. You&apos;ll receive an email when we respond<br />
        3. You can reply to this email or use the ticket page to add more details
      </Text>

      <Text style={smallText}>
        Need to add more information? Simply reply to this email or visit your{' '}
        <a href={`${baseUrl}/support/tickets`} style={link}>ticket dashboard</a>.
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

const ticketDetails = {
  margin: 0,
};

const detailRow = {
  margin: '0 0 8px',
  fontSize: '14px',
};

const ticketCode = {
  backgroundColor: '#e5e7eb',
  color: '#1f2937',
  padding: '2px 8px',
  borderRadius: '4px',
  fontFamily: 'monospace',
};

const descriptionSection = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const descriptionText = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '20px',
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
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

export default SupportTicketCreatedEmail;