// ============================================================================
// FILE: src/components/layouts/AuthLayout.tsx
// PURPOSE: Premium split-screen layout for authentication pages
// ============================================================================

import Link from 'next/link';
import { Terminal, Star, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn exists

interface AuthLayoutProps {
  children: React.ReactNode;
  heading?: string;
  description?: string;
}

export function AuthLayout({ children, heading, description }: AuthLayoutProps) {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 overflow-hidden">

      {/* Background Elements for Mobile/Tablet */}
      <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-950 lg:hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Left Side: Brand & Visuals */}
      <div className="relative hidden h-full flex-col bg-zinc-900 p-10 text-white lg:flex dark:border-r border-zinc-800">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/50 via-zinc-900 to-zinc-900 z-0" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

        {/* Brand Logo */}
        <div className="relative z-20 flex items-center text-lg font-bold tracking-tight">
          <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mr-3 shadow-xl">
            <Terminal className="h-5 w-5 text-white" />
          </div>
          Progress Tracker
        </div>

        {/* Feature Highlights (Mid-section) */}
        <div className="relative z-20 mt-auto mb-auto space-y-8 max-w-md">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/10 hover:scale-[1.02]">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Track Everything</h3>
              <p className="text-zinc-400 text-sm mt-1">Sync data from LeetCode, GitHub, and more automatically.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/10 hover:scale-[1.02]">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Secure by Default</h3>
              <p className="text-zinc-400 text-sm mt-1">Your data is encrypted and safe with enterprise-grade security.</p>
            </div>
          </div>
        </div>

        {/* Testimonial Footer */}
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-4">
            <div className="flex gap-1 text-yellow-500">
              {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="text-lg font-medium leading-relaxed">
              &ldquo;This platform revolutionized how I track my coding journey. The analytics are simply unmatched.&rdquo;
            </p>
            <footer className="text-sm">
              <div className="font-semibold text-white">Sofia Davis</div>
              <div className="text-zinc-500">Senior Full Stack Developer</div>
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="relative z-10 lg:p-8 flex items-center justify-center h-full w-full">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
          {(heading || description) && (
            <div className="flex flex-col space-y-2 text-center">
              {heading && <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{heading}</h1>}
              {description && <p className="text-base text-zinc-500 dark:text-zinc-400">{description}</p>}
            </div>
          )}

          {/* Main Form Content */}
          <div className="relative">
            {children}
          </div>

          <p className="px-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-400">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-400">
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