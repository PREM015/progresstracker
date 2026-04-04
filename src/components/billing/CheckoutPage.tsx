'use client';

import React from 'react';
import { CreditCard, ShieldCheck, Zap, Rocket, Check, Lock, ArrowRight, ShieldAlert, Sparkles, User, Mail, Globe, Briefcase } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const CheckoutPage = () => {
  return (
    <div className="space-y-12 py-12 px-6 max-w-7xl mx-auto">
      <section className="text-center space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
          Complete your <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent italic underline decoration-primary/20 underline-offset-8">Subscription</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Unlock unlimited platform syncs, team insights, and premium analytics today.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
           <GlassCard className="p-8 space-y-6 shadow-2xl border-primary/20 bg-background/50 backdrop-blur-xl">
             <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                   <CreditCard className="h-6 w-6 text-primary" />
                   Payment Details
                </h2>
                <div className="flex -space-x-2">
                   <div className="w-10 h-6 bg-zinc-100 rounded border border-zinc-200" />
                   <div className="w-10 h-6 bg-zinc-100 rounded border border-zinc-200" />
                   <div className="w-10 h-6 bg-zinc-100 rounded border border-zinc-200" />
                </div>
             </div>
             
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Cardholder Name</label>
                   <Input placeholder="John Doe" className="h-12 bg-background/50 border-muted focus-visible:ring-primary" />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Card Number</label>
                   <Input placeholder="•••• •••• •••• ••••" className="h-12 bg-background/50 border-muted focus-visible:ring-primary" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Expiry Date</label>
                      <Input placeholder="MM / YY" className="h-12 bg-background/50 border-muted focus-visible:ring-primary" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">CVC</label>
                      <Input placeholder="•••" className="h-12 bg-background/50 border-muted focus-visible:ring-primary" />
                   </div>
                </div>
             </div>
             
             <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <Lock className="h-5 w-5 text-primary shrink-0" />
                <p className="text-xs leading-relaxed text-muted-foreground italic">
                   Your payment information is encrypted and processed securely by Stripe. We never store your card details on our servers.
                </p>
             </div>
             
             <Button className="w-full h-14 text-xl font-bold shadow-2xl shadow-primary/20 gap-3">
                Subscribe for $29/mo
                <ArrowRight className="h-5 w-5" />
             </Button>
           </GlassCard>

           <div className="flex items-center justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default overflow-hidden whitespace-nowrap">
              <span className="text-xl font-black tracking-tighter italic">STRIPE</span>
              <span className="text-xl font-black tracking-tighter italic">VISA</span>
              <span className="text-xl font-black tracking-tighter italic">MASTERCARD</span>
              <span className="text-xl font-black tracking-tighter italic">AMEX</span>
           </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 h-fit">
           <GlassCard className="p-8 space-y-6 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
              <div className="flex items-center justify-between">
                 <Badge variant="secondary" className="bg-primary text-white hover:bg-primary/90 font-bold px-4 py-1">PRO PLAN</Badge>
                 <span className="text-sm font-semibold text-muted-foreground font-mono">Monthly</span>
              </div>
              
              <div className="space-y-4">
                 <h3 className="text-4xl font-extrabold tracking-tight">$29<span className="text-lg font-medium text-muted-foreground">/mo</span></h3>
                 <p className="text-sm text-muted-foreground leading-relaxed">Everything in Starter plus advanced analytics and team sync.</p>
              </div>
              
              <ul className="space-y-4 pt-4 border-t border-primary/10">
                 {[
                   'Unlimited Native Integrations',
                   'Advanced Resource Tracking',
                   'Team Performance Dashboards',
                   'Early Access to Beta Features',
                   '24/7 Priority Support',
                   'Custom Webhooks & API Access'
                 ].map((feat, i) => (
                   <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-500 shrink-0">
                         <Check className="h-3 w-3" />
                      </div>
                      {feat}
                   </li>
                 ))}
              </ul>

              <div className="pt-6 border-t border-primary/10 flex items-center justify-between text-lg font-bold">
                 <span>Annual Discount</span>
                 <span className="text-green-600 dark:text-green-500">-20% Applied</span>
              </div>
           </GlassCard>

           <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <h4 className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-500">
                 <Sparkles className="h-4 w-4" />
                 Limited Time Offer
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                 Subscribe now and get the first 3 months of the 2026 Developer Tool pack for free (worth $49).
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
