// ============================================================================
// FILE: src/components/layouts/AuthLayout.tsx
// PURPOSE: Layout for authentication pages (login, register)
// ============================================================================

import Link from 'next/link';
import { Terminal } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  heading?: string;
  description?: string;
}

export function AuthLayout({ children, heading, description }: AuthLayoutProps) {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Sidebar / Background */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Terminal className="mr-2 h-6 w-6" />
          Progress Tracker
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "Tracking my progress has never been easier. This platform helped me stay consistent with my coding practice."
            </p>
            <footer className="text-sm">Sofia Davis, Full Stack Developer</footer>
          </blockquote>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          {(heading || description) && (
            <div className="flex flex-col space-y-2 text-center">
              {heading && <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          )}
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
export default AuthLayout;