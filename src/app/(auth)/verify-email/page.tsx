import { AuthCard } from '@/components/auth/AuthCard';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MetaTags } from '@/components/seo/MetaTags';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <AuthLayout
      heading="Verify your email"
      description="We've sent you a verification link to your email address."
    >
      <MetaTags title="Verify Email" description="Verify your email address" />
      <AuthCard
        title="Check your inbox"
        description="Click the link in the email we sent to verify your account."
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Didn't receive the email? Check your spam folder or try logging in to resend.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to Login</Link>
          </Button>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}