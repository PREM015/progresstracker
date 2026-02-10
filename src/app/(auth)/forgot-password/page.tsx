import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MetaTags } from '@/components/seo/MetaTags';

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <MetaTags title="Forgot Password" description="Reset your password" />
      <ForgotPasswordForm />
    </AuthLayout>
  );
}