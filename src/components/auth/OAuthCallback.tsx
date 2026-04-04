'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ShieldCheck, Zap, Rocket, ArrowRight, Globe, Cpu } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { Button } from '@/components/ui/button';

export const OAuthCallback = () => {
  const [status, setStatus] = useState<'connecting' | 'success' | 'error'>('connecting');

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus('success');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto p-6 text-center">
      {status === 'connecting' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="relative h-28 w-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="flex -space-x-3">
                 <div className="w-12 h-12 rounded-full bg-zinc-900 border-4 border-background flex items-center justify-center shadow-xl z-20">
                    <FaGithub className="h-6 w-6 text-white" />
                 </div>
                 <div className="w-12 h-12 rounded-full bg-primary border-4 border-background flex items-center justify-center shadow-xl z-10 scale-110">
                    <Zap className="h-6 w-6 text-white fill-current" />
                 </div>
              </div>
           </div>
           
           <div className="space-y-4">
              <h1 className="text-3xl font-extrabold tracking-tight">Connecting GitHub...</h1>
              <p className="text-muted-foreground leading-relaxed italic">
                 We're securely linking your GitHub account and importing your recent activity.
              </p>
           </div>
           
           <div className="grid grid-cols-3 gap-2 py-4 border-y border-primary/10">
             <div className="flex flex-col items-center gap-1 opacity-70 group hover:opacity-100 transition-opacity cursor-default">
                <Cpu className="h-4 w-4 text-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-tighter italic">API Handshake</span>
             </div>
             <div className="flex flex-col items-center gap-1 opacity-70 group hover:opacity-100 transition-opacity cursor-default">
                <Globe className="h-4 w-4 text-green-500" />
                <span className="text-[10px] font-bold uppercase tracking-tighter italic">Syncing Data</span>
             </div>
             <div className="flex flex-col items-center gap-1 opacity-70 group hover:opacity-100 transition-opacity cursor-default">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-tighter italic">Securing Token</span>
             </div>
           </div>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-8 animate-in zoom-in fade-in duration-600">
           <div className="relative h-32 w-32 mx-auto">
              <div className="absolute inset-x-[-10px] inset-y-[-10px] bg-green-500/20 blur-2xl rounded-full opacity-50" />
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 border-4 border-background shadow-2xl flex items-center justify-center transform rotate-12 transition-transform hover:rotate-0 cursor-pointer group">
                 <CheckCircle2 className="h-16 w-16 text-white group-hover:scale-110 transition-transform" />
              </div>
           </div>
           
           <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tighter text-foreground italic uppercase">Connection Established</h1>
              <p className="text-muted-foreground leading-relaxed italic">
                 You've successfully authorized Progress Tracker. Your GitHub data will start appearing in your dashboard shortly.
              </p>
           </div>

           <Button size="lg" className="h-14 px-12 text-xl font-black italic tracking-tighter gap-4 shadow-2xl shadow-green-500/20 hover:scale-105 transition-all">
              Launch Dashboard
              <ArrowRight className="h-6 w-6" />
           </Button>
           
           <div className="pt-4 flex items-center justify-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-40">
              <span className="flex items-center gap-1"><Rocket className="h-3 w-3" /> v1.2</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Verified</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default OAuthCallback;
