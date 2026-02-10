import { RegisterForm } from '@/components/auth/RegisterForm';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MetaTags } from '@/components/seo/MetaTags';

export default function RegisterPage() {
  return (
    <AuthLayout>
      <MetaTags title="Register" description="Create a new Progress Tracker account" />
      <RegisterForm />
    </AuthLayout>
  );
}