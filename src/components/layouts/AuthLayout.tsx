import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  heading?: string;
  description?: string;
  showBackLink?: boolean;
  backLinkText?: string;
  backLinkHref?: string;
}

export function AuthLayout({
  children,
  heading,
  description,
  showBackLink = true,
  backLinkText = 'Back to home',
  backLinkHref = '/',
}: AuthLayoutProps) {
  return (
    <div className="container relative flex min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">

      {/* Background / Side panel for larger screens */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <Link href="/" className="relative z-20 flex items-center text-lg font-medium">
          <span className="bg-primary text-primary-foreground p-1 rounded-md mr-2">PT</span>
          ProgressTracker
        </Link>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "Track your coding journey across platforms. Gain insights, set goals, and improve daily."
            </p>
          </blockquote>
        </div>
      </div>

      <div className="lg:p-8 w-full max-w-sm mx-auto p-4">
        {showBackLink && (
          <Link
            href={backLinkHref}
            className={cn(
              'absolute left-4 top-4 md:left-8 md:top-8',
              'flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors'
            )}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {backLinkText}
          </Link>
        )}

        <div className="mx-auto flex w-full flex-col justify-center space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            {heading && <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
          <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}