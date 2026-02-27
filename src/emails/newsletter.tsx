// src/emails/newsletter.tsx
// Newsletter email template

import {
  Text,
  Section,
  Img,
  Link,
  Hr,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

interface NewsletterArticle {
  title: string;
  excerpt: string;
  url: string;
  image?: string;
  category: string;
}

interface NewsletterEmailProps {
  subscriberName?: string;
  subject: string;
  introText: string;
  articles: NewsletterArticle[];
  tips?: string[];
  unsubscribeToken: string;
}

export const NewsletterEmail: React.FC<NewsletterEmailProps> = ({
  subscriberName = 'Coder',
  subject = 'This Week in Coding',
  introText = 'Here are the latest updates from ProgressTracker.',
  articles = [],
  tips = [],
  unsubscribeToken = '',
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview={subject}>
      <Text style={heading}>📬 {subject}</Text>
      
      <Text style={paragraph}>
        Hi {subscriberName}! 👋
      </Text>
      
      <Text style={paragraph}>
        {introText}
      </Text>

      <Hr style={divider} />

      {/* Articles */}
      {articles.length > 0 && (
        <Section>
          <Text style={sectionTitle}>📰 Featured Articles</Text>
          {articles.map((article, index) => (
            <Section key={index} style={articleCard}>
              {article.image && (
                <Img
                  src={article.image}
                  width="100%"
                  height="150"
                  alt={article.title}
                  style={articleImage}
                />
              )}
              <Text style={articleCategory}>{article.category}</Text>
              <Link href={article.url} style={articleTitle}>
                {article.title}
              </Link>
              <Text style={articleExcerpt}>{article.excerpt}</Text>
              <Link href={article.url} style={readMore}>
                Read more →
              </Link>
            </Section>
          ))}
        </Section>
      )}

      {/* Tips Section */}
      {tips.length > 0 && (
        <>
          <Hr style={divider} />
          <Section>
            <Text style={sectionTitle}>💡 Quick Tips</Text>
            <Card variant="info">
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {tips.map((tip, index) => (
                  <li key={index} style={{ marginBottom: '8px', color: '#374151' }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>
          </Section>
        </>
      )}

      <Hr style={divider} />

      {/* CTA */}
      <Section style={ctaSection}>
        <Text style={ctaText}>
          Keep tracking your progress and stay consistent! 🚀
        </Text>
        <Button href={`${baseUrl}/dashboard`} variant="primary">
          View Your Dashboard
        </Button>
      </Section>

      <Text style={smallText}>
        You&apos;re receiving this because you subscribed to our newsletter.{' '}
        <Link 
          href={`${baseUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`} 
          style={link}
        >
          Unsubscribe
        </Link>
        {' or '}
        <Link href={`${baseUrl}/settings/notifications`} style={link}>
          manage preferences
        </Link>.
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
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const sectionTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 16px',
};

const articleCard = {
  marginBottom: '24px',
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
};

const articleImage = {
  borderRadius: '8px',
  marginBottom: '12px',
  objectFit: 'cover' as const,
};

const articleCategory = {
  fontSize: '12px',
  color: '#3b82f6',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
};

const articleTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  textDecoration: 'none',
  display: 'block',
  marginBottom: '8px',
};

const articleExcerpt = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '20px',
  margin: '0 0 8px',
};

const readMore = {
  fontSize: '14px',
  color: '#3b82f6',
  textDecoration: 'none',
  fontWeight: 'bold',
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '24px',
};

const ctaText = {
  fontSize: '18px',
  color: '#374151',
  margin: '0 0 16px',
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

export default NewsletterEmail;