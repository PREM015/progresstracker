'use client';

import React from 'react';
import { XCircle, ArrowLeft, MessageSquare, ShieldAlert, Zap, Rocket, RefreshCw, LifeBuoy } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const CancelPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] py-12 px-6 max-w-4xl mx-auto text-center space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative group">
        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity" />
        <div className="relative w-24 h-24 rounded-full bg-red-500/10 border-4 border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-500 shadow-2xl">
           <XCircle className="h-12 w-12" />
        </div>
      </div>

      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Purchase <span className="text-red-600 dark:text-red-500 italic">Cancelled</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Your checkout process was not completed and no charges were made to your account.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl pt-4">
        <GlassCard className="p-8 space-y-6 flex flex-col hover:border-primary/40 transition-all border-primary/5 group cursor-pointer">
           <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center p-2 group-hover:bg-primary/10 transition-colors">
              <RefreshCw className="h-6 w-6 text-primary" />
           </div>
           <div className="text-left space-y-2">
              <h3 className="text-xl font-bold">Try Again</h3>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                 Maybe it was just a transient network error. Our checkout system is highly resilient.
              </p>
           </div>
           <Button className="w-full mt-auto h-11 gap-2 font-bold shadow-xl shadow-primary/10">
              Return to Checkout
              <Rocket className="h-4 w-4" />
           </Button>
        </GlassCard>

        <GlassCard className="p-8 space-y-6 flex flex-col hover:border-amber-500/40 transition-all border-amber-500/5 group cursor-pointer">
           <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center p-2 group-hover:bg-amber-500/10 transition-colors">
              <LifeBuoy className="h-6 w-6 text-amber-500" />
           </div>
           <div className="text-left space-y-2">
              <h3 className="text-xl font-bold">Need Help?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                 Facing issues with payment methods? Our support team can help you resolve it quickly.
              </p>
           </div>
           <Button variant="outline" className="w-full mt-auto h-11 gap-2 font-bold border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10">
              <MessageSquare className="h-4 w-4" />
              Contact Support
           </Button>
        </GlassCard>
      </div>

      <div className="pt-8 flex flex-col items-center gap-6">
         <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground group h-10">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Pricing
         </Button>
         
         <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-40">
            <ShieldAlert className="h-4 w-4" />
            <span>Secure Transaction Hub v2.1</span>
         </div>
      </div>
    </div>
  );
};

export default CancelPage;
