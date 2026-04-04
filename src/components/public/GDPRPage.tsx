'use client';

import React from 'react';
import { Shield, Lock, Eye, Download, Trash2, FileText, ChevronRight, Mail, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const GDPRPage = () => {
  return (
    <div className="space-y-12 py-12 px-6 max-w-5xl mx-auto">
      <section className="text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          GDPR & <span className="text-primary">Data Privacy</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Your privacy is our priority. We are fully committed to GDPR compliance and protecting your digital footprint.
        </p>
        <div className="pt-2 text-xs text-muted-foreground font-mono uppercase tracking-widest">
           Last Updated: March 2026
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'The Right to be Forgotten', icon: <Trash2 className="h-5 w-5 text-red-500" />, desc: 'Delete your entire account and all associated data permanently.' },
          { title: 'Data Portability', icon: <Download className="h-5 w-5 text-blue-500" />, desc: 'Export all your tracked activities and profile data in JSON format.' },
          { title: 'Full Transparency', icon: <Eye className="h-5 w-5 text-amber-500" />, desc: 'Know exactly what data we collect and how it is used to improve your experience.' }
        ].map((p, i) => (
          <GlassCard key={i} className="p-6 space-y-3 hover:bg-primary/5 transition-all cursor-default group">
             <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                {p.icon}
             </div>
             <h3 className="font-bold text-lg">{p.title}</h3>
             <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-8">
        <aside className="lg:col-span-1 hidden lg:block sticky top-24 h-fit space-y-4">
           <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">On this page</h3>
           <ul className="space-y-3 text-sm font-medium">
              <li className="text-primary cursor-pointer hover:underline flex items-center gap-2">
                 <ChevronRight className="h-4 w-4" />
                 Introduction
              </li>
              <li className="text-muted-foreground cursor-pointer hover:text-foreground transition-all">Data Collection</li>
              <li className="text-muted-foreground cursor-pointer hover:text-foreground transition-all">Data Processing</li>
              <li className="text-muted-foreground cursor-pointer hover:text-foreground transition-all">Your Rights</li>
              <li className="text-muted-foreground cursor-pointer hover:text-foreground transition-all">Contact Us</li>
           </ul>
        </aside>

        <main className="lg:col-span-3 space-y-12">
           <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                 <Lock className="h-5 w-5 text-primary" />
                 1. Data Protection Overview
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed">
                 <p>
                    General Data Protection Regulation (GDPR) is a comprehensive data protection law that came into effect on May 25, 2018. 
                    It is designed to protect the privacy of European Union citizens and gives them control over their personal data. 
                    Progress Tracker is built with these principles at its core.
                 </p>
              </div>
           </section>

           <section className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                 <FileText className="h-5 w-5 text-primary" />
                 2. What Data We Collect
              </h2>
              <GlassCard className="p-6 bg-muted/20 border-0">
                 <div className="space-y-4">
                    <div className="flex gap-4">
                        <Badge variant="outline" className="h-fit py-1">Personal</Badge>
                        <p className="text-sm leading-relaxed">Name, email address, and profile pictures from connected accounts.</p>
                    </div>
                    <div className="flex gap-4">
                        <Badge variant="outline" className="h-fit py-1">technical</Badge>
                        <p className="text-sm leading-relaxed">IP addresses, browser types, and platform-specific identifiers (IDs).</p>
                    </div>
                    <div className="flex gap-4">
                        <Badge variant="outline" className="h-fit py-1">Activity</Badge>
                        <p className="text-sm leading-relaxed">Commits, streaks, goals, and achievement metadata from third-party APIs.</p>
                    </div>
                 </div>
              </GlassCard>
           </section>

           <section className="space-y-4">
              <h2 className="text-2xl font-bold">3. How We Use Your Data</h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                 We use the information we collect to operate and maintain the Progress Tracker service. 
                 Specifically, we process your activity data to generate visual analytics, streaks, and progress reports. 
                 We never sell your data to third-party advertisers.
              </p>
           </section>

           <GlassCard className="p-8 space-y-6 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                 <Mail className="h-6 w-6 text-primary" />
                 <h2 className="text-2xl font-bold">Questions?</h2>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                 Our Data Protection Officer (DPO) is available to answer any questions you have regarding our privacy practices or your data rights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                 <Button className="h-11 px-8 font-semibold">Email our DPO</Button>
                 <Button variant="outline" className="h-11 px-8 font-semibold">Privacy Policy</Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
                 <Info className="h-3 w-3" />
                 <span>Response time: Usually within 24-48 business hours.</span>
              </div>
           </GlassCard>
        </main>
      </div>
    </div>
  );
};

export default GDPRPage;
