import Link from 'next/link';

/**
 * Not Found Component
 * 
 * Displayed when a page is not found (404)
 */

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-100 gap-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-2xl font-semibold mt-4">Page Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
