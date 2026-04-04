'use client';

import React from 'react';
import { Rocket, CheckCircle2, Zap, ArrowRight, Share2, Download, Star, Sparkles, TrendingUp, ShieldCheck, Mail, Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const SuccessPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[700px] py-12 px-6 max-w-5xl mx-auto text-center space-y-12 animate-in fade-in zoom-in duration-700">
      <div className="relative">
        <div className="absolute inset-x-[-40px] inset-y-[-40px] bg-primary/20 blur-3xl rounded-full opacity-50 animate-pulse" />
        <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-blue-600 border-4 border-background flex items-center justify-center text-white shadow-2xl transform rotate-3 hover:rotate-0 transition-transform cursor-pointer group">
           <CheckCircle2 className="h-16 w-16 group-hover:scale-110 transition-transform" />
        </div>
        <div className="absolute -top-4 -right-4 bg-amber-500 rounded-full p-2 shadow-xl animate-bounce">
           <Star className="h-6 w-6 text-white fill-current" />
        </div>
      </div>

      <div className="space-y-4">
        <Badge variant="outline" className="px-4 py-1 border-primary/20 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest">
           Transaction Successful
        </Badge>
        <h1 className="text-5xl font-black tracking-tighter lg:text-7xl">
           Welcome to <span className="text-primary italic">Pro</span> Status
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
           Your subscription is active. You've just unlocked the most powerful productivity tools on the web.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8">
        {[
          { title: 'Launch Dashboard', desc: 'Sync your data and explore your new pro features.', icon: <Rocket className="h-6 w-6 text-primary" />, action: 'Explore Now', primary: true },
          { title: 'Team Access', desc: 'Invite up to 5 teammates to your shared workspace.', icon: <Users className="h-6 w-6 text-blue-500" />, action: 'Invite Team', primary: false },
          { title: 'Invoicing', desc: 'Download your receipt and manage billing settings.', icon: <Download className="h-6 w-6 text-amber-500" />, action: 'View Receipt', primary: false }
        ].map((item, i) => (
          <GlassCard key={i} className={`p-8 space-y-6 flex flex-col items-center hover:border-primary/40 transition-all cursor-pointer group ${item.primary ? 'border-primary/20 bg-primary/5 shadow-xl' : 'border-primary/5'}`}>
             <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center p-3 group-hover:bg-primary/10 transition-colors">
                {item.icon}
             </div>
             <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed italic">{item.desc}</p>
             </div>
             <Button variant={item.primary ? 'default' : 'outline'} className={`w-full mt-auto h-11 transition-all ${item.primary ? 'font-bold gap-2' : 'border-primary/20 hover:bg-primary/5'}`}>
                {item.action}
                {item.primary && <ArrowRight className="h-4 w-4" />}
             </Button>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-8 w-full max-w-3xl flex flex-col md:flex-row items-center justify-between gap-8 border-dashed border-2 bg-black/[0.02] dark:bg-white/[0.02]">
         <div className="text-left space-y-2 max-w-md">
            <h4 className="text-lg font-bold flex items-center gap-2">
               <Sparkles className="h-5 w-5 text-amber-500" />
               Share the Progress
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed italic">
               You just upgraded. Let your network know you're taking your productivity to the next level in 2026.
            </p>
         </div>
         <div className="flex gap-4 shrink-0">
            <Button variant="outline" className="gap-2 h-11 border-blue-500/20 hover:bg-blue-500/5">
               <Share2 className="h-4 w-4" />
               Share on Twitter
            </Button>
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-muted-foreground hover:bg-muted/80">
               <TrendingUp className="h-5 w-5" />
            </Button>
         </div>
      </GlassCard>

      <div className="pt-8 flex items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all cursor-default">
         <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-widest">PCI Compliant</span>
         </div>
         <div className="flex flex-col items-center gap-1">
            <Zap className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Instant Activation</span>
         </div>
         <div className="flex flex-col items-center gap-1">
            <Mail className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Receipt Sent</span>
         </div>
      </div>
    </div>
  );
};

export default SuccessPage;
