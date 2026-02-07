import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MetaTags } from '@/components/seo/MetaTags';

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      heading="Forgot Password"
      description="Enter your email address and we'll send you a link to reset your password."
    >
      <MetaTags title="Forgot Password" description="Reset your password" />
      <ForgotPasswordForm />
    </AuthLayout>
  );
}