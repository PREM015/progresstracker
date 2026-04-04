'use client';

import React from 'react';
import { Book, Search, Lightbulb, Zap, Rocket, Globe, ShieldCheck, CheckCircle2, ArrowRight, BookOpen, Clock, Tag, MessageCircle, FileText, Layout, PenTool, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const DocsPage = () => {
  return (
    <div className="space-y-16 py-12 px-6 max-w-7xl mx-auto">
      <section className="text-center space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
          Everything You Need to <span className="text-primary italic">Succeed</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Comprehensive guides, tutorials, and deep-dives into all features of Progress Tracker.
        </p>
        
        <div className="max-w-2xl mx-auto pt-4 relative">
           <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
           <Input 
             placeholder="Search documentation (Ctrl + K)" 
             className="pl-14 h-16 text-lg bg-background/50 border-primary/20 backdrop-blur rounded-2xl shadow-xl focus-visible:ring-primary" 
           />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
        {[
          { title: 'Getting Started', desc: 'New to Progress Tracker? Start here to get up and running in minutes.', icon: <Rocket className="h-6 w-6 text-blue-500" />, color: 'bg-blue-500/10' },
          { title: 'Goal Setting', desc: 'Master the art of creating trackable, ambitious goals and milestones.', icon: <Target className="h-6 w-6 text-purple-500" />, color: 'bg-purple-500/10' },
          { title: 'Integrations', desc: 'Connect GitHub, LeetCode, and 50+ other platforms to your dashboard.', icon: <Zap className="h-6 w-6 text-amber-500" />, color: 'bg-amber-500/10' }
        ].map((card, i) => (
          <GlassCard key={i} className="p-8 space-y-4 hover:-translate-y-2 transition-all hover:shadow-2xl border-primary/5 hover:border-primary/20 group">
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 ${card.color} group-hover:scale-110 transition-transform`}>
                {card.icon}
             </div>
             <h3 className="text-2xl font-bold tracking-tight">{card.title}</h3>
             <p className="text-muted-foreground leading-relaxed">{card.desc}</p>
             <Button variant="link" className="p-0 h-auto text-primary font-bold group-hover:gap-2 transition-all">
                Read Guide
                <ArrowRight className="h-4 w-4 ml-1" />
             </Button>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <aside className="lg:col-span-1 space-y-10">
           <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                 <BookOpen className="h-4 w-4" />
                 Popular Topics
              </h3>
              <ul className="space-y-3 text-sm font-medium">
                 {['Connecting GitHub', 'Creating a Squad', 'Customizing Widgets', 'Exporting Reports', 'Privacy Settings'].map(t => (
                   <li key={t} className="text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center gap-2 group/item">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted group-hover/item:bg-primary transition-colors" />
                      {t}
                   </li>
                 ))}
              </ul>
           </section>

           <GlassCard className="p-6 bg-primary/5 border-primary/10 space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm">
                 <MessageCircle className="h-4 w-4 text-primary" />
                 Need Live Help?
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                 Our support team is available 24/7 for our Pro and Enterprise customers. 
              </p>
              <Button size="sm" className="w-full text-xs font-bold">Open Support Chat</Button>
           </GlassCard>
        </aside>

        <main className="lg:col-span-3 space-y-12">
            <h2 className="text-3xl font-extrabold tracking-tight border-b pb-4">Browse by Category</h2>
            
            <div className="grid gap-6 md:grid-cols-2">
               {[
                 { title: 'Account & Security', count: 12, icon: <ShieldCheck /> },
                 { title: 'Dashboards & UI', count: 8, icon: <Layout /> },
                 { title: 'Personal Settings', count: 14, icon: <PenTool /> },
                 { title: 'Advanced Analytics', count: 6, icon: <TrendingUp /> },
                 { title: 'Platform Guides', count: 52, icon: <Globe /> },
                 { title: 'Data Management', count: 9, icon: <FileText /> }
               ].map((cat, i) => (
                 <GlassCard key={i} className="p-6 flex items-center gap-4 group hover:bg-muted/10 transition-all border-dashed border-2">
                    <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center shrink-0 border group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                       {React.cloneElement(cat.icon as any, { className: 'h-6 w-6' })}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{cat.title}</h4>
                       <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3" /> {cat.count} Articles
                       </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary">
                       <ArrowRight className="h-4 w-4" />
                    </Button>
                 </GlassCard>
               ))}
            </div>

            <GlassCard className="p-10 text-center space-y-6 bg-gradient-to-br from-background to-amber-500/5 border-amber-500/10">
               <Lightbulb className="h-10 w-10 text-amber-500 mx-auto" />
               <h3 className="text-2xl font-bold">Can't find what you're looking for?</h3>
               <p className="text-muted-foreground max-w-xl mx-auto">
                 Our documentation is updated daily based on user feedback. If you see a gap, please let us know so we can improve it.
               </p>
               <div className="flex justify-center gap-4">
                  <Button variant="outline" className="font-semibold">Request an Article</Button>
                  <Button className="font-semibold px-8 shadow-xl shadow-primary/10">Visit Community Forum</Button>
               </div>
            </GlassCard>
        </main>
      </div>

      <div className="pt-20 border-t flex flex-wrap items-center justify-between gap-6 text-sm text-muted-foreground">
         <div className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            <span>Last sync with Knowledge Base: 1 hour ago</span>
         </div>
         <div className="flex items-center gap-4">
            <span className="hover:text-primary cursor-pointer transition-colors">API Docs</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Changelog</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Legal docs</span>
         </div>
      </div>
    </div>
  );
};

const Target = ({ className }: { className?: string }) => (
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
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);

export default DocsPage;
