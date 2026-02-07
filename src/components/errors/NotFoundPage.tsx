import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft, Search } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <EmptyState
        icon={FileQuestion}
        title="Page Not Found"
        description="Sorry, we couldn't find the page you're looking for. It might have been moved or deleted."
        className="max-w-md border-none bg-transparent shadow-none"
        action={
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back fo Home
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">
                Go to Dashboard
              </Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
