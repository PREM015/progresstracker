// ============================================================================
// FILE: src/components/errors/NotFoundPage.tsx
// PURPOSE: Custom 404 Not Found page component
// ============================================================================

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="relative">
        <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-50" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-background border-4 border-muted">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>
      </div>

      <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-6xl">404</h1>
      <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
      <p className="mt-2 text-muted-foreground max-w-md mx-auto">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or never existed.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Button variant="default" asChild>
          <Link href={PUBLIC_ROUTES.HOME}>
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        {/* We can use history.back() logic via a client component wrapper if needed, 
            but a simple Link is safer for SSR */}
        <Button variant="outline" asChild>
          <Link href=".." aria-label="Go back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Link>
        </Button>
      </div>
    </div>
  );
}
