import Link from 'next/link';
import  Button from '@/components/ui/Button';
import  {ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Background Gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Track 50+ Platforms in One Place
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Stop Tracking Progress{' '}
            <span className="gradient-text">Manually</span>
          </h1>
          
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Automatically sync your LeetCode, GitHub, job applications, courses,
            and open-source contributions. Get insights, set goals, and stay consistent.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">
                View Features
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            No credit card required • Free forever for personal use
          </p>
        </div>

        {/* Hero Image/Dashboard Preview */}
        <div className="mt-16 flow-root sm:mt-24">
          <div className="relative rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 dark:bg-gray-100/5 dark:ring-gray-100/10">
            <img
              src="/dashboard-preview.png"
              alt="Dashboard Preview"
              className="rounded-lg shadow-2xl ring-1 ring-gray-900/10"
            />
          </div>
        </div>
      </div>
    </section>
  );
}