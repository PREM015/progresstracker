'use client';

import React from 'react';
import { Calendar, CheckCircle2, Circle, Clock, Milestone, Target, Construction, Zap, Rocket, Plus } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const RoadmapPage = () => {
  return (
    <div className="space-y-16 py-12 px-6 max-w-7xl mx-auto">
      <section className="text-center space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
          Product <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Roadmap</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          See what we're building next and help shape the future of Progress Tracker.
        </p>
        <div className="pt-4 flex flex-wrap justify-center gap-4">
           <Button variant="outline" className="gap-2 h-11 border-primary/20 bg-primary/5 hover:bg-primary/10">
             <Plus className="h-4 w-4" />
             Request a Feature
           </Button>
           <Button variant="ghost" className="gap-2 text-muted-foreground">
             <Clock className="h-4 w-4" />
             View Changelog
           </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[
          { 
            title: 'Q2 2026: The Intelligence Era', 
            status: 'Currently Building', 
            icon: <Construction className="h-5 w-5 text-amber-500" />,
            items: [
              { label: 'AI Predictive Goals', desc: 'Predict project completion dates based on historical velocity.', tag: 'AI' },
              { label: 'Platform Auto-Discovery', desc: 'Automatically find and connect your developer profiles across the web.', tag: 'UX' },
              { label: 'Team Velocity Insights', desc: 'Detailed tracking for squads and organizations.', tag: 'Team' }
            ]
          },
          { 
            title: 'Q3 2026: Seamless Integrations', 
            status: 'Planned', 
            icon: <Target className="h-5 w-5 text-blue-500" />,
            items: [
              { label: 'Jira Cloud Integration', desc: 'Sync your Jira tickets directly with personal goals.', tag: 'Sync' },
              { label: 'Custom Webhooks v2', desc: 'More granular events and retry logic.', tag: 'API' },
              { label: 'Slack & Discord App', desc: 'Update progress directly from your chat tools.', tag: 'UX' }
            ]
          },
          { 
             title: 'Q4 2026: Global Expansion', 
             status: 'Future Vision', 
             icon: <Milestone className="h-5 w-5 text-purple-500" />,
             items: [
               { label: 'Localization (12+ Languages)', desc: 'Full support for global developer communities.', tag: 'Global' },
               { label: 'Public Achievement Gallery', desc: 'Showcase your progress to the world.', tag: 'Social' },
               { label: 'Advanced Analytics Dashboard', desc: 'Export high-resolution reports for management.', tag: 'Reports' }
             ]
          }
        ].map((quarter, i) => (
          <GlassCard key={i} className="flex flex-col h-full border-t-4 border-t-primary/20 hover:border-t-primary transition-all">
             <div className="px-6 pt-6 flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                   {quarter.icon}
                </div>
                <Badge variant={i === 0 ? 'secondary' : 'outline'} className={
                  i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : ''
                }>
                   {quarter.status}
                </Badge>
             </div>
             
             <div className="p-6 flex-1 space-y-6">
                <h3 className="text-xl font-bold tracking-tight">{quarter.title}</h3>
                
                <ul className="space-y-6">
                   {quarter.items.map((item, j) => (
                     <li key={j} className="space-y-2 group cursor-default">
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[10px] h-4 uppercase tracking-tighter opacity-70">
                             {item.tag}
                           </Badge>
                           <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{item.label}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-1">{item.desc}</p>
                     </li>
                   ))}
                </ul>
             </div>
             
             <div className="px-6 pb-6 mt-auto">
                <Button variant="ghost" className="w-full text-xs gap-2 group hover:text-primary">
                  Follow Updates
                  <Rocket className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
             </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-8 lg:p-12 space-y-8 bg-black/[0.02] dark:bg-white/[0.02] border-dashed border-2">
         <div className="flex flex-col lg:flex-row items-center gap-8 justify-between">
            <div className="space-y-4 max-w-2xl text-center lg:text-left">
               <h2 className="text-3xl font-bold flex items-center gap-3 justify-center lg:justify-start">
                 <Rocket className="h-7 w-7 text-primary animate-pulse" />
                 Ready to Ship (Released Recently)
               </h2>
               <p className="text-muted-foreground">The following features were shipped in Q1 2026 after extensive beta testing.</p>
            </div>
            <Button variant="outline" size="sm" className="hidden lg:flex">Check All Releases</Button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {[
               'Multi-platform Sync Engine v3',
               'Revamped Mobile App Experience',
               'Enterprise-Grade SSO & Security',
               'Visual Goal Templates Library'
             ].map((feat, i) => (
               <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-background/50 border border-transparent hover:border-green-500/20 transition-all hover:bg-green-500/5 group">
                  <CheckCircle2 className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm group-hover:text-green-600 dark:group-hover:text-green-400">{feat}</span>
               </div>
             ))}
         </div>
      </GlassCard>
    </div>
  );
};

export default RoadmapPage;
