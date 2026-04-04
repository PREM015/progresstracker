'use client';

import React from 'react';
import { ShieldCheck, Lock, Eye, Key, ShieldAlert, FileText, Globe, CheckCircle2, Server, Terminal, Info, Users, Flag, Landmark } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const SecurityPage = () => {
  return (
    <div className="space-y-16 py-12 px-6 max-w-7xl mx-auto text-foreground/80 leading-relaxed">
      <section className="text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto border-2 border-primary/20">
           <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl max-w-4xl mx-auto">
          Built for <span className="text-primary underline underline-offset-8 decoration-primary/20">Security</span> & Trust
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
           How we protect your data through advanced encryption, rigorous testing, and industry-standard compliance.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-12">
        {[
          { title: 'Data Encryption', label: 'AES-256', desc: 'All data is encrypted at rest and in transit using industry-standard protocols.', icon: <Lock className="h-5 w-5 text-blue-500" /> },
          { title: 'SOC 2 Type II', label: 'Compliant', desc: 'Independently audited for security, availability, processing integrity, and privacy.', icon: <Landmark className="h-5 w-5 text-purple-500" /> },
          { title: 'SSO & OAuth', label: 'Standard', desc: 'Secure login via SAML, OIDC, and role-based access control (RBAC).', icon: <Key className="h-5 w-5 text-amber-500" /> },
          { title: 'VDP Program', label: 'Active', desc: 'Robust Vulnerability Disclosure Program to reward external security researchers.', icon: <Flag className="h-5 w-5 text-green-500" /> }
        ].map((feat, i) => (
          <GlassCard key={i} className="p-8 space-y-4 hover:border-primary/40 transition-all border-primary/5 cursor-default group">
             <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                {feat.icon}
             </div>
             <div className="space-y-1">
                <Badge variant="outline" className="text-[10px] h-4 uppercase tracking-tighter opacity-70 mb-1">{feat.label}</Badge>
                <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{feat.title}</h3>
             </div>
             <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
         <main className="lg:col-span-2 space-y-16">
            <section className="space-y-6">
               <h2 className="text-3xl font-extrabold flex items-center gap-3">
                  <Server className="h-7 w-7 text-primary" />
                  Infrastructure Security
               </h2>
               <div className="prose prose-sm dark:prose-invert max-w-none text-lg">
                  <p>
                     Progress Tracker is hosted on Tier 1 cloud providers (AWS and Vercel) with restricted physical access and 24/7 surveillance. 
                     Our network is logically isolated using VPCs and guarded by next-gen firewalls.
                  </p>
               </div>
               <ul className="space-y-4 pt-4">
                  {[
                    'Automatic nightly backups with 30-day retention',
                    'DDoS protection and rate limiting at the edge',
                    'Zero-trust networking for all internal services',
                    'Real-time anomaly detection and intrusion monitoring'
                  ].map((p, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                       <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                       {p}
                    </li>
                  ))}
               </ul>
            </section>

            <section className="space-y-6">
               <h2 className="text-3xl font-extrabold flex items-center gap-3">
                  <Terminal className="h-7 w-7 text-primary" />
                  Secure Software Development
               </h2>
               <p className="text-lg">
                  We integrate security into every stage of our CI/CD pipeline. Every line of code is reviewed and scanned before reaching production.
               </p>
               <GlassCard className="p-8 space-y-6 border-dashed border-2">
                  <div className="grid gap-6 sm:grid-cols-2">
                     <div className="space-y-2">
                        <h4 className="font-bold text-sm">Static Analysis (SAST)</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Continuous code scanning for patterns that lead to common vulnerabilities.</p>
                     </div>
                     <div className="space-y-2">
                        <h4 className="font-bold text-sm">Dependency Auditing</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Automated alerts for vulnerable third-party libraries and instant patching.</p>
                     </div>
                     <div className="space-y-2">
                        <h4 className="font-bold text-sm">Penetration Testing</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Quaterly deep-dives by external security firms to find edge-case vulnerabilities.</p>
                     </div>
                     <div className="space-y-2">
                        <h4 className="font-bold text-sm">Bug Bounty</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Active private bounty program rewarding high-impact security findings.</p>
                     </div>
                  </div>
               </GlassCard>
            </section>
         </main>

         <aside className="space-y-10 lg:sticky lg:top-24 h-fit">
            <GlassCard className="p-6 space-y-4 bg-primary/5 border-primary/10">
               <ShieldAlert className="h-6 w-6 text-red-500" />
               <h3 className="text-lg font-bold">Reporting a Vulnerability</h3>
               <p className="text-xs leading-relaxed text-muted-foreground">
                  If you've found a security issue, please contact us immediately through our private disclosure portal. We prioritize and reward high-quality reports.
               </p>
               <Button className="w-full h-11 text-xs font-bold gap-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600">
                  Submit Security Report
               </Button>
            </GlassCard>

            <GlassCard className="p-6 space-y-4">
               <FileText className="h-5 w-5 text-primary" />
               <h3 className="text-lg font-bold">Compliance Downloads</h3>
               <ul className="space-y-3">
                  {['SOC 2 Type II Bridge Letter', 'Standard Privacy Policy', 'GDPR Data Processing Addendum'].map((doc, i) => (
                    <li key={i} className="flex items-center justify-between group cursor-pointer hover:text-primary transition-all">
                       <span className="text-xs font-medium">{doc}</span>
                       <Badge variant="outline" className="text-[8px] h-3 px-1 border-primary/20 group-hover:border-primary">PDF</Badge>
                    </li>
                  ))}
               </ul>
            </GlassCard>
         </aside>
      </div>

      <GlassCard className="p-10 lg:p-16 text-center space-y-8 bg-zinc-950 dark:bg-white/[0.02] border-zinc-800 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10">
            <Globe className="h-48 w-48 rotate-12" />
         </div>
         <div className="relative z-10 space-y-6">
            <h2 className="text-3xl font-extrabold text-white">Trust our Global Infrastructure</h2>
            <p className="text-zinc-400 max-w-xl mx-auto leading-relaxed">
               Trusted by security teams at organizations ranging from high-growth startups to Fortune 500 enterprises.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
               {['Vercel', 'AWS', 'Google Cloud', 'Cloudflare', 'Snyk'].map(brand => (
                 <span key={brand} className="text-2xl font-black text-white italic tracking-tighter">{brand}</span>
               ))}
            </div>
         </div>
      </GlassCard>
    </div>
  );
};

export default SecurityPage;
