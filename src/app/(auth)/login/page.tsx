import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MetaTags } from '@/components/seo/MetaTags';

export default function LoginPage() {
  return (
    <AuthLayout>
      <MetaTags title="Login" description="Sign in to your Progress Tracker account" />
      <LoginForm />
    </AuthLayout>
  );
}