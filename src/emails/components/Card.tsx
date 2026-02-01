// src/emails/components/Card.tsx
import { Section, Text } from '@react-email/components';
import * as React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Card: React.FC<CardProps> = ({ children, title, variant = 'default' }) => {
  const colors = {
    default: { bg: '#f3f4f6', border: '#e5e7eb' },
    success: { bg: '#ecfdf5', border: '#10b981' },
    warning: { bg: '#fffbeb', border: '#f59e0b' },
    danger: { bg: '#fef2f2', border: '#ef4444' },
    info: { bg: '#eff6ff', border: '#3b82f6' },
  };

  const { bg, border } = colors[variant];

  return (
    <Section
      style={{
        backgroundColor: bg,
        borderLeft: `4px solid ${border}`,
        borderRadius: '8px',
        padding: '20px',
        margin: '16px 0',
      }}
    >
      {title && (
        <Text
          style={{
            fontWeight: 'bold',
            margin: '0 0 8px',
            fontSize: '16px',
          }}
        >
          {title}
        </Text>
      )}
      {children}
    </Section>
  );
};

export default Card;