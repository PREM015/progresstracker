import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MetaTags } from '@/components/seo/MetaTags';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      heading="Reset Password"
      description="Enter your new password below."
    >
      <MetaTags title="Reset Password" description="Set a new password for your account" />
      {/* Suspense boundary required for useSearchParams */}
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}