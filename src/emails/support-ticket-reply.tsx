// src/emails/support-ticket-reply.tsx
// Email sent when there's a reply on a support ticket

import {
  Text,
  Section,
  
  Hr,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

interface SupportTicketReplyEmailProps {
  userName: string;
  ticketNumber: string;
  ticketId: string;
  subject: string;
  replierName: string;
  isStaffReply: boolean;
  replyContent: string;
  repliedAt: string;
  previousMessages?: Array<{
    author: string;
    content: string;
    timestamp: string;
    isStaff: boolean;
  }>;
}

export const SupportTicketReplyEmail: React.FC<SupportTicketReplyEmailProps> = ({
  userName = 'User',
  ticketNumber = 'TKT-000000',
  ticketId = '',
  subject = 'Support Request',
  replierName = 'Support Team',
  isStaffReply = true,
  replyContent = '',
  repliedAt = new Date().toISOString(),
  previousMessages = [],
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview={`New reply on ticket ${ticketNumber}`}>
      <Text style={heading}>
        {isStaffReply ? '💬 Support Team Replied' : '💬 New Reply on Your Ticket'}
      </Text>
      
      <Text style={paragraph}>
        Hi {userName},
      </Text>
      
      <Text style={paragraph}>
        {isStaffReply 
          ? `${replierName} from our support team has responded to your ticket.`
          : `There's a new reply on your support ticket.`
        }
      </Text>

      <Card variant="info">
        <Text style={{ margin: 0, fontSize: '14px' }}>
        <strong>Ticket:</strong> <Text style={ticketCode}>{ticketNumber}</Text><br />

          <strong>Subject:</strong> {subject}
        </Text>
      </Card>

      {/* New Reply */}
      <Section style={replyCard}>
        <Section style={replyHeader}>
          <Text style={replyAuthor}>
            {isStaffReply && '👤 '}{replierName}
            {isStaffReply && <span style={staffBadge}>Staff</span>}
          </Text>
          <Text style={replyTime}>
            {new Date(repliedAt).toLocaleString()}
          </Text>
        </Section>
        <Text style={replyContent_style}>{replyContent}</Text>
      </Section>

      {/* Previous Messages */}
      {previousMessages.length > 0 && (
        <>
          <Hr style={divider} />
          <Text style={previousTitle}>Previous Messages</Text>
          {previousMessages.slice(0, 3).map((msg, index) => (
            <Section key={index} style={previousMessage}>
              <Text style={previousHeader}>
                <strong>{msg.author}</strong>
                {msg.isStaff && <span style={staffBadge}>Staff</span>}
                <span style={previousTime}>{new Date(msg.timestamp).toLocaleString()}</span>
              </Text>
              <Text style={previousContent}>{msg.content}</Text>
            </Section>
          ))}
          {previousMessages.length > 3 && (
            <Text style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' as const }}>
              + {previousMessages.length - 3} more messages
            </Text>
          )}
        </>
      )}

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/support/tickets/${ticketId}`} variant="primary">
          View Ticket & Reply
        </Button>
      </Section>

      <Text style={smallText}>
        You can reply to this email directly or use the button above to respond.
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

const ticketCode = {
  backgroundColor: '#e5e7eb',
  color: '#1f2937',
  padding: '2px 8px',
  borderRadius: '4px',
  fontFamily: 'monospace',
};

const replyCard = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const replyHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const replyAuthor = {
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: 0,
  fontSize: '14px',
};

const staffBadge = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '10px',
  marginLeft: '8px',
  verticalAlign: 'middle',
};

const replyTime = {
  fontSize: '12px',
  color: '#6b7280',
  margin: 0,
};

const replyContent_style = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#374151',
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const previousTitle = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#6b7280',
  margin: '0 0 12px',
};

const previousMessage = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '12px',
  marginBottom: '8px',
};

const previousHeader = {
  fontSize: '12px',
  color: '#374151',
  margin: '0 0 8px',
};

const previousTime = {
  color: '#9ca3af',
  marginLeft: '8px',
};

const previousContent = {
  fontSize: '13px',
  color: '#6b7280',
  margin: 0,
  lineHeight: '18px',
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

export default SupportTicketReplyEmail;