'use client';

import React from 'react';
import { Search, Rocket, Zap, Globe, Code2, Cpu, Database, Layout, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const ExplorePlatformsPage = () => {
  return (
    <div className="space-y-16 py-12 px-6 max-w-7xl mx-auto">
      <section className="text-center space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl max-w-4xl mx-auto leading-tight">
          One Dashboard for Every <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">Developer Platform</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Connect your favorite coding, git, and career platforms to sync your progress automatically.
        </p>
        <div className="max-w-xl mx-auto relative group">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search 50+ integrations (e.g. LeetCode, GitHub, LinkedIn...)" 
            className="h-14 pl-12 rounded-2xl bg-muted/50 border-primary/10 shadow-xl focus-visible:ring-primary focus-visible:ring-offset-0 text-lg"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-4">
        {['All', 'Coding', 'Versioning', 'Career', 'Learning', 'Other'].map((cat) => (
          <Button key={cat} variant={cat === 'All' ? 'default' : 'outline'} className="rounded-full px-6 shadow-sm">
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { name: 'GitHub', category: 'Versioning', icon: <FaGithub className="h-6 w-6" />, color: 'bg-zinc-900', light: 'bg-zinc-100', text: 'text-zinc-900', darkText: 'dark:text-white', desc: 'Sync repositories, contributions, and streaks.' },
          { name: 'LeetCode', category: 'Coding', icon: <Code2 className="h-6 w-6" />, color: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', desc: 'Track solved problems and contest ratings.' },
          { name: 'LinkedIn', category: 'Career', icon: <Globe className="h-6 w-6" />, color: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600', desc: 'Auto-update your profile with latest achievements.' },
          { name: 'GitLab', category: 'Versioning', icon: <FaGithub className="h-6 w-6" />, color: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', desc: 'Connect private and public GitLab projects.' },
          { name: 'Codeforces', category: 'Coding', icon: <Zap className="h-6 w-6" />, color: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600', desc: 'Monitor contest performance and problem count.' },
          { name: 'Udemy', category: 'Learning', icon: <Database className="h-6 w-6" />, color: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-600', desc: 'Import course completion and skill certs.' },
          { name: 'Vercel', category: 'Cloud', icon: <Cpu className="h-6 w-6" />, color: 'bg-black', light: 'bg-zinc-100', text: 'text-zinc-900', darkText: 'dark:text-white', desc: 'Track deployments and site performance metrics.' },
          { name: 'HackerRank', category: 'Coding', icon: <Layout className="h-6 w-6" />, color: 'bg-green-600', light: 'bg-green-50', text: 'text-green-600', desc: 'Sync challenge scores and verified skills.' }
        ].map((platform, i) => (
          <GlassCard key={i} className="p-6 space-y-4 hover:border-primary/40 transition-all cursor-pointer group flex flex-col items-start border-primary/5 shadow-lg">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center p-2.5 shadow-inner transition-transform group-hover:scale-110 ${platform.light}`}>
               <span className={platform.text + " " + (platform.darkText || "")}>{platform.icon}</span>
            </div>
            <div className="space-y-1">
              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tighter opacity-70">{platform.category}</Badge>
              <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{platform.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic">{platform.desc}</p>
            <div className="pt-4 mt-auto w-full flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Connect Now</span>
               <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-10 lg:p-16 bg-primary/5 border-primary/10 rounded-3xl text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Rocket className="h-64 w-64 rotate-12" />
        </div>
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <Badge className="bg-primary text-white hover:bg-primary/90 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">Developer API Available</Badge>
          <h2 className="text-3xl font-extrabold lg:text-5xl tracking-tight">Don't see your platform?</h2>
          <p className="text-lg text-muted-foreground italic">
            Build your own integration using our open platform API, or request a native connection from our engineering team.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button size="lg" className="h-14 px-10 text-lg font-bold shadow-xl shadow-primary/20 gap-3">
              Request Platform
              <Zap className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold backdrop-blur">
              <ShieldCheck className="h-5 w-5 mr-3" />
              Integration Docs
            </Button>
          </div>
        </div>
      </GlassCard>

      <div className="text-center space-y-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
         <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Certified Sync Partners</p>
         <div className="flex justify-center gap-12 pt-4">
            {['AWS', 'Google', 'Stripe', 'Twilio', 'Slack'].map(brand => (
              <span key={brand} className="text-xl font-black italic tracking-tighter">{brand}</span>
            ))}
         </div>
      </div>
    </div>
  );
};

export default ExplorePlatformsPage;
