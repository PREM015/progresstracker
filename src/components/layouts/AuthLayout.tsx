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
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 overflow-hidden noise-overlay">

      {/* Background Elements for Mobile/Tablet */}
      <div className="absolute inset-0 bg-background lg:hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500/20 rounded-full blur-[120px] animate-pulse animation-delay-2000" />
      </div>

      {/* Left Side: Brand & Visuals */}
      <div className="relative hidden h-full flex-col bg-zinc-950 p-12 text-white lg:flex border-r border-white/5">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/80 via-zinc-950 to-zinc-950 z-0" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center bg-[size:40px_40px] opacity-20 [mask-image:linear-gradient(180deg,white,transparent)]" />

        {/* Floating Halo */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] animate-pulse" />

        {/* Brand Logo */}
        <div className="relative z-20 flex items-center text-2xl font-black tracking-tighter">
          <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mr-4 shadow-2xl">
            <Terminal className="h-6 w-6 text-white" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Progress Tracker</span>
        </div>

        {/* Feature Highlights (Mid-section) */}
        <div className="relative z-20 mt-auto mb-auto space-y-10 max-w-md">
          <div className="flex items-start gap-6 p-6 rounded-2xl glass border-white/10 transition-all hover:bg-white/10 hover:scale-[1.02] hover:shadow-2xl group">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
              <Zap className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Track Everything</h3>
              <p className="text-zinc-400 mt-2 leading-relaxed">Sync data from LeetCode, GitHub, and more automatically.</p>
            </div>
          </div>
          <div className="flex items-start gap-6 p-6 rounded-2xl glass border-white/10 transition-all hover:bg-white/10 hover:scale-[1.02] hover:shadow-2xl group">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Secure by Default</h3>
              <p className="text-zinc-400 mt-2 leading-relaxed">Your data is encrypted and safe with enterprise-grade security.</p>
            </div>
          </div>
        </div>

        {/* Testimonial Footer */}
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-6">
            <div className="flex gap-1.5 text-yellow-500">
              {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-5 w-5 fill-current" />)}
            </div>
            <p className="text-2xl font-bold leading-tight tracking-tight text-white/90">
              &ldquo;This platform revolutionized how I track my coding journey. The analytics are simply unmatched.&rdquo;
            </p>
            <footer className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-zinc-800 border border-white/10" />
              <div>
                <div className="font-bold text-white text-lg">Sofia Davis</div>
                <div className="text-zinc-500 font-medium">Senior Full Stack Developer</div>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="relative z-10 lg:p-12 flex items-center justify-center min-h-screen">
        <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[440px] px-6">
          {(heading || description) && (
            <div className="flex flex-col space-y-3 text-center mb-4">
              {heading && <h1 className="text-4xl font-black tracking-tight text-foreground">{heading}</h1>}
              {description && <p className="text-lg text-muted-foreground font-medium">{description}</p>}
            </div>
          )}

          {/* Main Form Content */}
          <div className="relative scale-in">
            {children}
          </div>

          <p className="text-center text-sm text-muted-foreground font-medium max-w-[280px] mx-auto">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-primary hover:underline underline-offset-4">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:underline underline-offset-4">
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