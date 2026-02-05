// app/(auth)/verify-email/page.tsx
import React from 'react';
import VerifyEmailForm from '@/components/auth/VerifyEmailForm';

export const metadata = {
  title: 'Verify Email - ProgressTracker',
  description: 'Verify your email address',
};

interface VerifyEmailPageProps {
  searchParams: {
    email?: string;
  };
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  return (
    <div className="p-8">
      <VerifyEmailForm email={searchParams.email} />
    </div>
  );
}