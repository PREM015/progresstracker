// app/(auth)/reset-password/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Reset Password - ProgressTracker',
};

export default function ResetPasswordRedirectPage() {
  // This page redirects to forgot-password if accessed directly
  redirect('/forgot-password');
}