'use client';

import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MetaTags } from '@/components/seo/MetaTags';
import { useSearchParams } from 'next/navigation';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'user@example.com';

  const handleVerify = async (code: string) => {
    console.log('Verifying code:', code);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleResend = async () => {
    console.log('Resending code to:', email);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <AuthLayout>
      <MetaTags title="Verify Email" description="Verify your email address" />
      <VerifyEmailForm
        email={email}
        onVerify={handleVerify}
        onResend={handleResend}
      />
    </AuthLayout>
  );
}