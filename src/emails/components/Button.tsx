// src/emails/components/Button.tsx
import { Button as EmailButton } from '@react-email/components';
import * as React from 'react';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
}

export const Button: React.FC<ButtonProps> = ({ href, children, variant = 'primary' }) => {
  const colors = {
    primary: { bg: '#3b82f6', text: '#ffffff' },
    secondary: { bg: '#6b7280', text: '#ffffff' },
    success: { bg: '#10b981', text: '#ffffff' },
    danger: { bg: '#ef4444', text: '#ffffff' },
    warning: { bg: '#f59e0b', text: '#000000' },
  };

  const { bg, text } = colors[variant];

  return (
    <EmailButton
      href={href}
      style={{
        backgroundColor: bg,
        borderRadius: '8px',
        color: text,
        fontSize: '16px',
        fontWeight: 'bold',
        textDecoration: 'none',
        textAlign: 'center' as const,
        display: 'inline-block',
        padding: '12px 24px',
        margin: '16px 0',
      }}
    >
      {children}
    </EmailButton>
  );
};

export default Button;