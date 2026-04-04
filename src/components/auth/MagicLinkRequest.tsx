'use client';

import React, { useState } from 'react';
import { Mail, ArrowRight, Loader2, ShieldCheck, Zap, Info, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const MagicLinkRequest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 2000);
  };

  if (isSent) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border-4 border-green-500/20 text-green-600 dark:text-green-500">
          <CheckCircle2 className="h-10 w-10 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Check your email</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            We've sent a magic link to <span className="font-semibold text-foreground">your@email.com</span>. 
            Click the link in the email to sign in instantly.
          </p>
        </div>
        <Button variant="ghost" className="text-primary hover:bg-primary/5 font-semibold" onClick={() => setIsSent(false)}>
           Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 p-2">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Welcome Back</h1>
        <p className="text-muted-foreground">Sign in securely without a password using your email.</p>
      </div>

      <GlassCard className="p-8 space-y-6 shadow-2xl border-primary/20 bg-background/50 backdrop-blur-xl">
         <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
               <label className="text-sm font-semibold pl-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Email Address
               </label>
               <Input 
                 placeholder="name@example.com" 
                 type="email" 
                 required 
                 className="h-12 bg-background/50 border-muted focus-visible:ring-primary text-lg"
                 autoFocus
               />
            </div>
            <Button 
              className="w-full h-12 text-lg font-bold shadow-xl shadow-primary/20 gap-2 overflow-hidden group relative" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending Link...
                </>
              ) : (
                <>
                  Send Magic Link
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
         </form>

         <div className="relative flex items-center justify-center pt-2">
            <div className="absolute inset-0 flex items-center">
               <span className="w-full border-t border-muted" />
            </div>
            <span className="relative bg-background px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Trusted by Developers</span>
         </div>
         
         <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
               <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
               Passwordless
            </div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
               <Zap className="h-3.5 w-3.5 text-amber-500" />
               One-click Login
            </div>
         </div>
      </GlassCard>

      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3">
         <Info className="h-5 w-5 text-primary shrink-0" />
         <p className="text-[11px] leading-relaxed text-muted-foreground">
           By continuing, you agree to our <span className="underline cursor-pointer hover:text-primary">Terms of Service</span> and <span className="underline cursor-pointer hover:text-primary">Privacy Policy</span>. 
           We'll never share your email with third parties.
         </p>
      </div>
    </div>
  );
};

export default MagicLinkRequest;
