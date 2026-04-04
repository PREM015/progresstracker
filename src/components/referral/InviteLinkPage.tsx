'use client';

import React from 'react';
import { UserPlus, Gift, Rocket, Sparkles, CheckCircle2, ShieldCheck, Zap, ArrowRight, Star, Users, Globe, Briefcase, Share2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const InviteLinkPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-6 max-w-5xl mx-auto text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="relative group">
        <div className="absolute inset-x-[-50px] inset-y-[-50px] bg-primary/20 blur-3xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity" />
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-purple-600 border-4 border-background flex items-center justify-center text-white shadow-2xl transform rotate-12 group-hover:rotate-0 transition-all cursor-pointer">
           <UserPlus className="h-16 w-16" />
        </div>
        <div className="absolute top-[-5px] right-[-5px] bg-amber-500 rounded-full p-2 shadow-xl animate-bounce">
           <Gift className="h-6 w-6 text-white fill-current" />
        </div>
      </div>

      <div className="space-y-4">
        <Badge variant="outline" className="px-4 py-1 border-primary/20 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest">
           Exclusive Invitation
        </Badge>
        <h1 className="text-5xl font-black tracking-tighter lg:text-7xl">
           Join <span className="text-primary underline decoration-primary/20 underline-offset-8">John's</span> Squad
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
           You've been invited to join Progress Tracker. Collaborate, compete, and grow together with your team.
        </p>
      </div>

      <GlassCard className="p-10 w-full max-w-2xl space-y-8 shadow-2xl border-primary/20 bg-background/50 backdrop-blur-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-5">
            <Users className="h-48 w-48 rotate-12" />
         </div>
         <div className="relative z-10 space-y-6">
            <div className="space-y-2">
               <h3 className="text-2xl font-bold tracking-tight italic">Ready to accept?</h3>
               <p className="text-sm text-muted-foreground leading-relaxed italic">
                  Join 12 other developers in John's core squad and start syncing your progress today.
               </p>
            </div>
            
            <div className="grid gap-4 pt-4">
               <Button className="h-14 text-xl font-bold shadow-2xl shadow-primary/20 gap-3">
                  Accept Invitation
                  <ArrowRight className="h-5 w-5" />
               </Button>
               <Button variant="outline" className="h-14 text-xl font-bold backdrop-blur">
                  Learn More
               </Button>
            </div>
            
            <div className="pt-6 border-t border-primary/10 flex items-center justify-center gap-8 opacity-60">
               <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Secure Join</span>
               </div>
               <div className="flex flex-col items-center gap-1">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Instant Sync</span>
               </div>
               <div className="flex flex-col items-center gap-1">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Premium Plan</span>
               </div>
            </div>
         </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pt-8">
        {[
          { icon: <Globe className="h-6 w-6 text-blue-500" />, title: 'Multi-Platform Sync', desc: 'Connect 50+ dev tools.' },
          { icon: <Briefcase className="h-6 w-6 text-purple-500" />, title: 'Squad Insights', desc: 'See how your team tracks.' },
          { icon: <Sparkles className="h-6 w-6 text-amber-500" />, title: 'Smart Goals', desc: 'AI-driven goal tracking.' }
        ].map((feat, i) => (
          <div key={i} className="space-y-3 group cursor-default">
             <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                {feat.icon}
             </div>
             <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{feat.title}</h4>
             <p className="text-xs text-muted-foreground italic leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>

      <div className="pt-12 text-center space-y-4">
         <p className="text-muted-foreground text-sm italic">
            Not John? <span className="text-primary font-bold cursor-pointer hover:underline">Signup for your own account</span>
         </p>
         <Button variant="ghost" className="gap-2 text-muted-foreground opacity-50 h-8">
            <Share2 className="h-3 w-3" />
            Report this Link
         </Button>
      </div>
    </div>
  );
};

export default InviteLinkPage;
