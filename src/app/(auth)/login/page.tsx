import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MetaTags } from '@/components/seo/MetaTags';

export default function LoginPage() {
  return (
    <AuthLayout
      heading="Welcome back"
      description="Enter your email to sign in to your account"
    >
      <MetaTags title="Login" description="Sign in to your Progress Tracker account" />
      <LoginForm />
    </AuthLayout>
  );
}