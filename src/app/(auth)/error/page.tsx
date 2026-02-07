import { AuthCard } from '@/components/auth/AuthCard';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MetaTags } from '@/components/seo/MetaTags';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ErrorContent() {
    // This hook needs to be inside a component wrapper or Suspense
    // But since this is a server component by default (unless 'use client'), 
    // we should make this a client component or handle search params safely.
    // Let's make a client component wrapper for the content.
    return <AuthErrorContent />;
}

// Client component for content
'use client';
import { useSearchParams as useClientSearchParams } from 'next/navigation';

function AuthErrorContent() {
    const searchParams = useClientSearchParams();
    const error = searchParams.get('error');

    let errorMessage = 'An unknown error occurred.';
    if (error === 'Configuration') {
        errorMessage = 'There is a problem with the server configuration.';
    } else if (error === 'AccessDenied') {
        errorMessage = 'Access denied. You do not have permission to sign in.';
    } else if (error === 'Verification') {
        errorMessage = 'The verification link may have expired or has already been used.';
    }

    return (
        <AuthCard
            title="Authentication Error"
            description="There was a problem signing you in."
        >
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                    <AlertCircle className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                    {errorMessage}
                </p>
                <Button asChild className="w-full mt-2">
                    <Link href="/login">Back to Login</Link>
                </Button>
            </div>
        </AuthCard>
    );
}

// Main page component
export default function ErrorPage() {
    return (
        <AuthLayout
            heading="Something went wrong"
            description="We couldn't sign you in."
        >
            <MetaTags title="Auth Error" description="Authentication error occurred" />
            <Suspense fallback={<div>Loading...</div>}>
                <ErrorContent />
            </Suspense>
        </AuthLayout>
    );
}
