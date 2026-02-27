// app/(auth)/layout.tsx
import React from 'react';
import AuthLayout from '@/components/layouts/AuthLayout';

export const metadata = {
  title: 'Authentication - ProgressTracker',
  description: 'Sign in or create an account',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}