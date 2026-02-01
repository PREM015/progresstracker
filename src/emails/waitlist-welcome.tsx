// src/emails/waitlist-welcome.tsx
// Email sent when someone joins the waitlist

import {
  Text,
  Section,
  Link,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

interface WaitlistWelcomeEmailProps {
  email: string;
  name?: string;
  position: number;
  referralCode: string;
  estimatedLaunchDate?: string;
  features?: string[];
}

export const WaitlistWelcomeEmail: React.FC<WaitlistWelcomeEmailProps> = ({
  email = 'user@example.com',
  name = '',
  position = 0,
  referralCode = '',
  estimatedLaunchDate = 'Q1 2024',
  features = [
    'Track progress across 60+ coding platforms',
    'GitHub, LeetCode, Codeforces auto-sync',
    'Beautiful analytics and streak tracking',
    'Goal setting and achievement system',
    'Weekly progress reports',
  ],
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
  const referralLink = `${baseUrl}?ref=${referralCode}`;
  const displayName = name || 'there';

  return (
    <EmailLayout preview="You're on the ProgressTracker waitlist! 🎉">
      <Text style={heading}>🎉 You&apos;re on the List!</Text>
      
      <Text style={paragraph}>
        Hey {displayName},
      </Text>
      
      <Text style={paragraph}>
        Welcome to the ProgressTracker waitlist! We&apos;re thrilled to have you join our 
        community of developers who are serious about tracking their coding journey.
      </Text>

      <Card variant="success" title="Your Waitlist Position">
        <Text style={positionNumber}>#{position}</Text>
        <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
          out of {Math.round(position * 1.3)} signups
        </Text>
      </Card>

      <Text style={paragraph}>
        <strong>What is ProgressTracker?</strong>
      </Text>
      <Text style={paragraph}>
        ProgressTracker is the ultimate dashboard for developers to track their coding 
        progress across multiple platforms in one beautiful interface.
      </Text>

      <Section style={featuresSection}>
        <Text style={{ fontWeight: 'bold', marginBottom: '12px' }}>
          ✨ What you&apos;ll get:
        </Text>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {features.map((feature, index) => (
            <li key={index} style={{ marginBottom: '8px', color: '#374151' }}>
              {feature}
            </li>
          ))}
        </ul>
      </Section>

      {/* Referral Section */}
      <Card variant="info" title="🚀 Skip the Line!">
        <Text style={{ margin: '0 0 12px', fontSize: '14px' }}>
          Share your unique link and move up the waitlist when friends join:
        </Text>
        <Section style={referralBox}>
          <Text style={referralLinkText}>{referralLink}</Text>
        </Section>
        <Text style={{ margin: '12px 0 0', fontSize: '14px' }}>
          Each friend who signs up moves you up 5 spots! 📈
        </Text>
      </Card>

      <Section style={shareButtons}>
        <Link 
          href={`https://twitter.com/intent/tweet?text=I just joined the @ProgressTracker waitlist! Track your coding progress across 60+ platforms. Join me: ${referralLink}`}
          style={shareButton}
        >
          Share on Twitter
        </Link>
        <Link 
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${referralLink}`}
          style={shareButton}
        >
          Share on LinkedIn
        </Link>
      </Section>

      <Text style={paragraph}>
        We&apos;re working hard to launch by <strong>{estimatedLaunchDate}</strong>. 
        We&apos;ll keep you updated on our progress!
      </Text>

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/waitlist/status?email=${encodeURIComponent(email)}`} variant="primary">
          Check Your Status
        </Button>
      </Section>

      <Text style={smallText}>
        Questions? Just reply to this email – we read every message!
      </Text>

      <Text style={signoff}>
        Happy coding! 🚀<br />
        The ProgressTracker Team
      </Text>
    </EmailLayout>
  );
};

// Styles
const heading = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
};

const positionNumber = {
  fontSize: '48px',
  fontWeight: 'bold',
  color: '#10b981',
  margin: '0',
  textAlign: 'center' as const,
};

const featuresSection = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px 16px 16px 20px',
  margin: '24px 0',
};

const referralBox = {
  backgroundColor: '#1f2937',
  borderRadius: '6px',
  padding: '12px',
};

const referralLinkText = {
  fontFamily: 'monospace',
  fontSize: '14px',
  color: '#10b981',
  margin: 0,
  wordBreak: 'break-all' as const,
  textAlign: 'center' as const,
};

const shareButtons = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'center',
  margin: '24px 0',
};

const shareButton = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
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

const signoff = {
  fontSize: '16px',
  color: '#374151',
  margin: '32px 0 0',
};

export default WaitlistWelcomeEmail;