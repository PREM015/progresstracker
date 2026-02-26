// app/(auth)/reset-password/[token]/page.tsx
import React from 'react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Reset Password - ProgressTracker',
  description: 'Create a new password',
};

interface ResetPasswordPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { token } = await params;
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Reset Password
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your new password below
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}