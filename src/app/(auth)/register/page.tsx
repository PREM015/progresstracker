import { RegisterForm } from '@/components/auth/RegisterForm';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MetaTags } from '@/components/seo/MetaTags';

export default function RegisterPage() {
  return (
    <AuthLayout
      heading="Create an account"
      description="Enter your email below to create your account"
    >
      <MetaTags title="Register" description="Create a new Progress Tracker account" />
      <RegisterForm />
    </AuthLayout>
  );
}