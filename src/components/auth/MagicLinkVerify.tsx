'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ShieldCheck, Zap, Rocket, ArrowRight, ShieldX, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const MagicLinkVerify = () => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus('success');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto p-6 text-center">
      {status === 'verifying' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="relative h-24 w-24 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <ShieldCheck className="absolute inset-0 m-auto h-10 w-10 text-primary animate-pulse" />
           </div>
           
           <div className="space-y-4">
              <h1 className="text-3xl font-extrabold tracking-tight">Verifying your link...</h1>
              <p className="text-muted-foreground leading-relaxed">
                 We're confirming your identity and establishing a secure session. This will only take a moment.
              </p>
           </div>
           
           <div className="flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground overflow-hidden">
              <span className="flex items-center gap-1.5 animate-pulse"><Zap className="h-3 w-3 text-amber-500" /> One-click login</span>
              <span className="opacity-20">|</span>
              <span className="flex items-center gap-1.5 animate-pulse delay-75"><ShieldCheck className="h-3 w-3 text-green-500" /> Secure SSL</span>
              <span className="opacity-20">|</span>
              <span className="flex items-center gap-1.5 animate-pulse delay-150"><Rocket className="h-3 w-3 text-blue-500" /> v1.2</span>
           </div>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-8 animate-in zoom-in fade-in duration-500">
           <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center border-4 border-green-500/20 text-green-600 dark:text-green-500 mx-auto shadow-[0_0_50px_-12px_rgba(34,197,94,0.3)]">
              <CheckCircle2 className="h-12 w-12" />
           </div>
           
           <div className="space-y-4">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Welcome back, John!</h1>
              <p className="text-muted-foreground leading-relaxed">
                 Your link has been verified successfully. We're redirecting you to your dashboard now.
              </p>
           </div>

           <Button size="lg" className="h-12 px-10 text-lg font-bold gap-3 shadow-xl hover:scale-105 transition-transform">
              Go to Dashboard
              <ArrowRight className="h-5 w-5" />
           </Button>
           
           <div className="pt-4 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Redirecting in 3s...
           </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
           <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border-4 border-red-500/20 text-red-600 dark:text-red-500 mx-auto">
              <ShieldX className="h-12 w-12" />
           </div>
           
           <div className="space-y-4">
              <h1 className="text-3xl font-extrabold tracking-tight">Invalid or expired link</h1>
              <p className="text-muted-foreground leading-relaxed">
                 The magic link you clicked has already been used or has expired. For security reasons, links are only valid for 15 minutes.
              </p>
           </div>

           <Button variant="outline" size="lg" className="h-12 px-10 text-lg font-bold gap-3 backdrop-blur shadow-xl hover:bg-primary/5 transition-all">
              <RefreshCw className="h-5 w-5" />
              Request New Link
           </Button>
           
           <p className="text-xs text-muted-foreground">
             Need help? <span className="underline cursor-pointer hover:text-primary transition-colors">Contact Support</span>
           </p>
        </div>
      )}
    </div>
  );
};

export default MagicLinkVerify;
