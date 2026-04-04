'use client';

import React from 'react';
import { Search, Zap, Puzzle, MessageSquare, Briefcase, Terminal, Globe, ShieldCheck, CheckCircle2, ArrowRight, ExternalLink, Plus } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const IntegrationsPage = () => {
  return (
    <div className="space-y-16 py-12 px-6 max-w-7xl mx-auto">
      <section className="text-center space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl max-w-4xl mx-auto">
          Power your workflow with <span className="text-primary underline decoration-primary/20 underline-offset-8">Integrations</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Connect the tools you already use to automate your progress tracking and keep the whole team in sync.
        </p>
        
        <div className="pt-4 flex flex-wrap justify-center gap-4">
           <Button size="lg" className="h-12 px-8 text-lg font-bold gap-2">
             <Plus className="h-5 w-5" />
             Browse All
           </Button>
           <Button size="lg" variant="outline" className="h-12 px-8 text-lg font-bold backdrop-blur">
             Build Integration
           </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {[
           { 
             name: 'Slack', 
             desc: 'Get real-time updates on goal milestones and achievements directly in your team channels.', 
             icon: <MessageSquare className="h-6 w-6 text-purple-600" />,
             category: 'Communication',
             status: 'Official'
           },
           { 
             name: 'Jira Cloud', 
             desc: 'Link Jira issues to your personal progress tracker to automatically sync ticket status.', 
             icon: <Briefcase className="h-6 w-6 text-blue-600" />,
             category: 'Project Management',
             status: 'Official'
           },
           { 
             name: 'GitHub Actions', 
             desc: 'Trigger progress updates on every successful build or deployment automatically.', 
             icon: <Terminal className="h-6 w-6 text-zinc-900 dark:text-white" />,
             category: 'DevOps',
             status: 'Certified'
           },
           { 
             name: 'Discord', 
             desc: 'Broadcast your achievements to your community with our fully customizable Discord bot.', 
             icon: <MessageSquare className="h-6 w-6 text-indigo-500" />,
             category: 'Communication',
             status: 'Community'
           },
           { 
             name: 'Linear', 
             desc: 'Sync your Linear issues and cycles to track your velocity relative to team goals.', 
             icon: <Zap className="h-6 w-6 text-blue-400" />,
             category: 'Project Management',
             status: 'Preview' 
           },
           { 
             name: 'Sentry', 
             desc: 'Track your bug fixing progress and error-free days directly in your dashboard.', 
             icon: <ShieldCheck className="h-6 w-6 text-red-500" />,
             category: 'Monitoring',
             status: 'Official'
           }
         ].map((int, i) => (
           <GlassCard key={i} className="p-8 space-y-6 flex flex-col hover:border-primary/40 transition-all group border-primary/5 hover:-translate-y-1">
              <div className="flex items-start justify-between">
                 <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center p-2 group-hover:bg-primary/10 transition-colors">
                    {int.icon}
                 </div>
                 <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-widest ${
                   int.status === 'Official' ? 'border-primary/50 text-primary' : 
                   int.status === 'Preview' ? 'border-amber-500/50 text-amber-600 dark:text-amber-400' :
                   'border-muted/50 text-muted-foreground'
                 }`}>
                   {int.status}
                 </Badge>
              </div>
              
              <div className="space-y-2">
                 <h3 className="text-xl font-extrabold tracking-tight group-hover:text-primary transition-colors">{int.name}</h3>
                 <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4">{int.category}</Badge>
                 <p className="text-sm text-muted-foreground leading-relaxed pt-2">{int.desc}</p>
              </div>
              
              <div className="mt-auto pt-6 flex items-center justify-between">
                 <Button variant="ghost" className="p-0 h-auto text-xs font-bold gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                    Learn More
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                 </Button>
                 <Button size="sm" variant="outline" className="h-8 px-4 text-xs font-bold border-primary/20 bg-primary/5 hover:bg-primary/10">Install</Button>
              </div>
           </GlassCard>
         ))}
      </div>

      <section className="space-y-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b pb-8">
           <h2 className="text-3xl font-bold flex items-center gap-3">
              <Puzzle className="h-7 w-7 text-primary" />
              Ecosystem & Apps
           </h2>
           <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search 50+ tools..." className="pl-9 h-10 bg-background/50 border-primary/10" />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[
             { name: 'Monday.com', type: 'PM', author: 'Official' },
             { name: 'Trello', type: 'PM', author: 'Community' },
             { name: 'Notion', type: 'Note-taking', author: 'Preview' },
             { name: 'Datadog', type: 'Monitoring', author: 'Official' },
             { name: 'Azure DevOps', type: 'DevOps', author: 'Official' },
             { name: 'CircleCI', type: 'CI/CD', author: 'Certified' },
             { name: 'Bitbucket', type: 'VC', author: 'Official' },
             { name: 'GitLab', type: 'VC', author: 'Official' }
           ].map((app, i) => (
             <GlassCard key={i} className="p-5 flex items-center gap-4 group cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all border-transparent">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                   <Globe className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="min-w-0">
                   <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{app.name}</h4>
                   <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{app.type} • {app.author}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
             </GlassCard>
           ))}
        </div>
      </section>

      <GlassCard className="p-12 text-center space-y-8 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 group relative overflow-hidden">
         <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
         <div className="relative z-10 space-y-6">
            <h2 className="text-4xl font-extrabold tracking-tight">Need a custom integration?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
               Our powerful public API allows you to build anything you can imagine. Check out our developer documentation to get started.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
               <Button size="lg" className="h-14 px-10 text-lg font-bold gap-3 shadow-xl hover:scale-105 transition-transform">
                  Browse API Docs
                  <ArrowRight className="h-5 w-5" />
               </Button>
               <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold backdrop-blur">
                  Join Discord Community
               </Button>
            </div>
            <div className="pt-8 flex items-center justify-center gap-8">
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>SDKs for Node, Go, & Python</span>
               </div>
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Real-time Webhooks</span>
               </div>
            </div>
         </div>
      </GlassCard>
    </div>
  );
};

export default IntegrationsPage;
