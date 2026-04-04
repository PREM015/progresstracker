'use client';

import React from 'react';
import { ShieldCheck, Zap, Globe, Cpu, Database, LayoutGrid, CheckCircle2, AlertTriangle, Clock, RefreshCw, BarChart3, Info, Server, Activity } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export const StatusPage = () => {
  return (
    <div className="space-y-12 py-12 px-6 max-w-5xl mx-auto">
      <section className="text-center space-y-6">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 border-4 border-green-500/20 text-green-600 dark:text-green-500">
           <CheckCircle2 className="h-10 w-10 animate-pulse" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          All Systems <span className="text-green-600 dark:text-green-500">Operational</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed italic">
          Real-time updates on our system status, uptime, and performance.
        </p>
        <div className="pt-4 flex items-center justify-center gap-4 text-xs font-mono uppercase tracking-widest text-muted-foreground italic">
           <RefreshCw className="h-3 w-3 animate-spin duration-[4s]" />
           Last Check: Just Now
        </div>
      </section>

      <GlassCard className="p-8 space-y-8 bg-black/[0.02] dark:bg-white/[0.02] border-primary/5 shadow-2xl">
         <div className="flex items-center justify-between border-b pb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
               <Activity className="h-6 w-6 text-primary" />
               Current Uptime
            </h2>
            <div className="flex gap-4 text-sm font-semibold">
               <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span>99.99% (30d)</span>
               </div>
            </div>
         </div>
         
         <div className="space-y-10 pt-4">
            {[
              { name: 'Core API Gateway', status: 'Operational', latency: '42ms', data: Array.from({ length: 40 }, () => Math.random() > 0.95 ? 'partial' : 'up') },
              { name: 'Dashboard Web App', status: 'Operational', latency: '124ms', data: Array.from({ length: 40 }, () => 'up') },
              { name: 'Background Workers', status: 'Operational', latency: '2s avg', data: Array.from({ length: 40 }, () => Math.random() > 0.98 ? 'partial' : 'up') },
              { name: 'Platform Sync Engine', status: 'Operational', latency: '850ms', data: Array.from({ length: 40 }, () => 'up') },
              { name: 'Notification Service', status: 'Operational', latency: '15ms', data: Array.from({ length: 40 }, () => 'up') }
            ].map((system, i) => (
              <div key={i} className="space-y-4">
                 <div className="flex items-end justify-between">
                    <div>
                       <h3 className="font-bold text-lg tracking-tight">{system.name}</h3>
                       <p className="text-xs text-muted-foreground flex items-center gap-2 italic">
                          Latency: <span className="font-mono text-primary font-bold">{system.latency}</span>
                       </p>
                    </div>
                    <Badge variant="outline" className="h-6 border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/5 font-bold">
                       {system.status}
                    </Badge>
                 </div>
                 
                 <div className="flex gap-1 h-8">
                    {system.data.map((d, j) => (
                      <div 
                        key={j} 
                        className={`flex-1 rounded-sm transition-all hover:scale-y-125 transform-gpu cursor-pointer ${
                          d === 'up' ? 'bg-green-500/40 hover:bg-green-500 dark:bg-green-500/30' : 'bg-amber-400 dark:bg-amber-600/50 hover:bg-amber-500'
                        }`}
                        title={d === 'up' ? 'Operational' : 'Degraded Performance'}
                      />
                    ))}
                 </div>
                 
                 <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold font-mono opacity-50">
                    <span>30 days ago</span>
                    <span>Today</span>
                 </div>
              </div>
            ))}
         </div>
      </GlassCard>

      <section className="grid gap-6 md:grid-cols-2">
         <GlassCard className="p-6 space-y-4 hover:border-primary/20 transition-all cursor-default">
            <h3 className="font-bold flex items-center gap-2">
               <BarChart3 className="h-5 w-5 text-primary" />
               Global Latency
            </h3>
            <div className="space-y-4 pt-2">
               {[
                 { region: 'US East (Virginia)', ms: 24 },
                 { region: 'EU West (Dublin)', ms: 48 },
                 { region: 'Asia Pacific (Tokyo)', ms: 112 },
                 { region: 'South America (São Paulo)', ms: 140 }
               ].map((r) => (
                 <div key={r.region} className="flex items-center justify-between text-sm italic">
                    <span className="text-muted-foreground">{r.region}</span>
                    <span className="font-mono font-bold text-primary">{r.ms}ms</span>
                 </div>
               ))}
            </div>
         </GlassCard>

         <GlassCard className="p-6 space-y-6 bg-primary/5 border-primary/10">
            <h3 className="font-bold flex items-center gap-2">
               <Clock className="h-5 w-5 text-primary" />
               Incident History
            </h3>
            <ul className="space-y-6">
               <li className="space-y-1 relative pl-6 border-l-2 border-muted pb-4">
                  <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter italic">March 22, 2026</span>
                  <h4 className="text-sm font-semibold">Scheduled Database Maintenance</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">System remained operational with expected brief performance degradation.</p>
               </li>
               <li className="space-y-1 relative pl-6 border-l-2 border-muted">
                  <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter italic">March 04, 2026</span>
                  <p className="text-sm font-semibold italic opacity-60">No incidents reported.</p>
               </li>
            </ul>
            <Button variant="link" className="p-0 h-auto text-xs font-bold group">
               View Full Incident History
               <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
         </GlassCard>
      </section>

      <div className="p-8 rounded-2xl bg-muted/20 border-2 border-dashed flex flex-col items-center text-center space-y-4">
         <Info className="h-8 w-8 text-muted-foreground" />
         <div className="space-y-2">
            <h4 className="font-bold">Subscription Alerts</h4>
            <p className="text-sm text-muted-foreground max-w-md italic">Want to be notified of incidents or scheduled maintenance directly in your inbox?</p>
         </div>
         <div className="flex gap-2 pt-2 w-full max-w-sm">
            <Input placeholder="name@company.com" className="bg-background/80 h-10" />
            <Button className="px-8 shadow-xl shadow-primary/10 h-10 font-bold">Subscribe</Button>
         </div>
      </div>
      
      <div className="flex justify-center gap-8 pt-8 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
         <FaGithub className="h-5 w-5" />
         <Globe className="h-5 w-5" />
         <LayoutGrid className="h-5 w-5" />
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

export default StatusPage;
