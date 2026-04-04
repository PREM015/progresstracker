'use client';

import React, { useState } from 'react';
import { MailX, ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Rocket, Star, MessageSquare } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const UnsubscribePage = () => {
  const [status, setStatus] = useState<'initial' | 'processing' | 'success'>('initial');

  const handleUnsubscribe = () => {
    setStatus('processing');
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] py-12 px-6 max-w-4xl mx-auto text-center space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="relative group">
        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity" />
        <div className="relative w-24 h-24 rounded-full bg-red-500/10 border-4 border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-500 shadow-2xl transition-transform group-hover:rotate-12">
           <MailX className="h-12 w-12" />
        </div>
      </div>

      <div className="space-y-4">
        <Badge variant="outline" className="px-4 py-1 border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest">
           Subscription Update
        </Badge>
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
           Confirm <span className="text-red-600 dark:text-red-500 italic">Unsubscribe</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed italic">
           We're sorry to see you go. Are you sure you'd like to stop receiving all our updates?
        </p>
      </div>

      <GlassCard className="p-10 w-full max-w-lg space-y-8 shadow-2xl border-red-500/10 bg-background/50 backdrop-blur-3xl relative overflow-hidden">
         {status === 'initial' && (
           <div className="space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="space-y-2">
                 <h3 className="text-2xl font-bold tracking-tight">Email: john@doe.com</h3>
                 <p className="text-sm text-muted-foreground leading-relaxed italic">
                    Unsubscribing will remove you from all mailing lists, including developer updates and weekly digests.
                 </p>
              </div>
              
              <div className="grid gap-4">
                 <Button 
                   variant="destructive" 
                   className="h-14 text-xl font-bold shadow-2xl shadow-red-500/20 gap-3 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600" 
                   onClick={handleUnsubscribe}
                 >
                    Confirm Unsubscribe
                 </Button>
                 <Button variant="outline" className="h-14 text-xl font-bold backdrop-blur">
                    No, take me back
                 </Button>
              </div>
           </div>
         )}

         {status === 'processing' && (
           <div className="space-y-8 py-8 animate-in fade-in duration-500">
              <RefreshCw className="h-16 w-16 text-primary animate-spin mx-auto" />
              <div className="space-y-2">
                 <h3 className="text-2xl font-bold tracking-tight">Processing request...</h3>
                 <p className="text-sm text-muted-foreground italic">Updating our global delivery system.</p>
              </div>
           </div>
         )}

         {status === 'success' && (
           <div className="space-y-8 animate-in zoom-in fade-in duration-500">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border-4 border-green-500/20 text-green-600 dark:text-green-500 mx-auto shadow-xl">
                 <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-4">
                 <h3 className="text-3xl font-bold tracking-tight">Successfully Unsubscribed</h3>
                 <p className="text-sm text-muted-foreground leading-relaxed italic">
                    You've been removed from all lists. You may still receive critical system and billing alerts.
                 </p>
              </div>
              <Button className="w-full h-12 text-lg font-bold gap-3 shadow-xl hover:scale-105 transition-transform">
                 Go to Dashboard
                 <ArrowRight className="h-5 w-5" />
              </Button>
           </div>
         )}
      </GlassCard>

      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 flex gap-4 max-w-xl mx-auto">
         <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
         <p className="text-[11px] text-amber-800 dark:text-amber-500 text-left leading-relaxed italic">
            <strong>Wait!</strong> If you only want to receive fewer emails, you can <span className="underline cursor-pointer font-bold">customize your preferences</span> instead of unsubscribing completely.
         </p>
      </div>

      <div className="pt-8 flex flex-col items-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default group">
         <div className="flex items-center gap-8">
            <div className="flex flex-col items-center gap-1">
               <ShieldCheck className="h-4 w-4" />
               <span className="text-[8px] font-bold uppercase tracking-widest">Global Opt-out</span>
            </div>
            <div className="flex flex-col items-center gap-1">
               <Zap className="h-4 w-4" />
               <span className="text-[8px] font-bold uppercase tracking-widest">Instant Action</span>
            </div>
         </div>
         <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            Made a mistake? <span className="text-primary font-bold cursor-pointer hover:underline">Re-subscribe in one click</span>
         </p>
      </div>
    </div>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

export default UnsubscribePage;
