import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MetaTags } from '@/components/seo/MetaTags';

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <MetaTags title="Reset Password" description="Create a new password" />
      <ResetPasswordForm />
    </AuthLayout>
  );
}