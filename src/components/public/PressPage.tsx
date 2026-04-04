'use client';

import React from 'react';
import { Newspaper, Download, Share2, Mail, ExternalLink, MessageSquare, Briefcase, Info, TrendingUp, Users, Globe } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const PressPage = () => {
  return (
    <div className="space-y-16 py-12 px-6 max-w-7xl mx-auto">
      <section className="text-center space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
          Press & <span className="text-primary underline underline-offset-8">Media</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The latest news, media kits, and company announcements from Progress Tracker.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-6">
           <GlassCard className="p-6 space-y-4 bg-primary/5 border-primary/20">
              <h3 className="font-bold flex items-center gap-2">
                 <Mail className="h-4 w-4" />
                 Media Contact
              </h3>
              <p className="text-sm text-muted-foreground tracking-wide">
                 For media inquiries, interview requests, and press credentials.
              </p>
              <div className="space-y-2 pt-2">
                 <p className="text-sm font-semibold">press@progresstracker.app</p>
                 <Button variant="outline" className="w-full text-xs h-9">Contact Media Team</Button>
              </div>
           </GlassCard>

           <GlassCard className="p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                 <Download className="h-4 w-4" />
                 Assets
              </h3>
              <ul className="space-y-3">
                 {[
                   { label: 'Brand Guidelines', size: '2.4 MB' },
                   { label: 'Logo Pack (SVG/PNG)', size: '8.1 MB' },
                   { label: 'Founder Photos', size: '12.5 MB' },
                   { label: 'Product Screenshots', size: '15.2 MB' }
                 ].map((asset, i) => (
                   <li key={i} className="flex items-center justify-between text-xs group cursor-pointer hover:text-primary transition-colors">
                      <span>{asset.label}</span>
                      <span className="text-muted-foreground group-hover:text-primary">{asset.size}</span>
                   </li>
                 ))}
              </ul>
              <Button className="w-full h-10 gap-2">
                Download Press Kit
                <Download className="h-3.5 w-3.5" />
              </Button>
           </GlassCard>
        </aside>

        <main className="lg:col-span-3 space-y-8">
           <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-2xl font-bold">Latest Stories</h2>
              <div className="flex gap-2">
                 <Badge variant="outline" className="cursor-pointer hover:bg-primary/5">All</Badge>
                 <Badge variant="secondary" className="cursor-pointer">Announcements</Badge>
                 <Badge variant="outline" className="cursor-pointer hover:bg-primary/5">Features</Badge>
              </div>
           </div>

           <div className="grid gap-6">
              {[
                { 
                  title: 'Progress Tracker raises $10M Series A to revolutionize developer wellness', 
                  source: 'TechCrunch', 
                  date: 'Oct 12, 2026',
                  excerpt: 'With over 1 million daily active users, Progress Tracker is becoming the standard for measuring engineering output without burnout.'
                },
                { 
                  title: 'DeepMind partners with Progress Tracker for predictive productivity insights', 
                  source: 'VentureBeat', 
                  date: 'Aug 24, 2026',
                  excerpt: 'Artificial intelligence meets productivity tracking in a new partnership that promises to predict project delays before they happen.'
                },
                { 
                  title: 'Top 10 Developer Tools of 2026: Productivity Reimagined', 
                  source: 'Hacker News Digest', 
                  date: 'Jun 30, 2026',
                  excerpt: 'Our editors reviewed the landscape and found Progress Tracker to be the most comprehensive platform for multi-source tracking.'
                }
              ].map((story, i) => (
                <GlassCard key={i} className="p-6 group hover:translate-x-1 transition-all hover:border-primary/40 cursor-pointer">
                   <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-primary/10 text-primary border-primary/20">{story.source}</Badge>
                      <span className="text-xs text-muted-foreground tracking-tighter uppercase font-bold">• {story.date}</span>
                   </div>
                   <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors leading-tight">{story.title}</h3>
                   <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{story.excerpt}</p>
                   <Button variant="link" className="p-0 h-auto text-primary font-bold group-hover:gap-2 transition-all">
                      Read Full Story
                      <ExternalLink className="h-3.5 w-3.5 ml-1" />
                   </Button>
                </GlassCard>
              ))}
           </div>
           
           <div className="text-center pt-8">
              <Button variant="outline" size="lg" className="px-12 backdrop-blur hover:bg-primary/5">Load More Stories</Button>
           </div>
        </main>
      </div>

      <GlassCard className="p-12 text-center space-y-8 bg-gradient-to-br from-background to-blue-500/5 border-blue-500/10">
         <h2 className="text-3xl font-bold">By the Numbers</h2>
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: '1M+', label: 'Active Users', icon: <Users className="h-5 w-5 text-blue-500" /> },
              { value: '500M+', label: 'Goals Tracked', icon: <TrendingUp className="h-5 w-5 text-green-500" /> },
              { value: '45+', label: 'Integrations', icon: <Briefcase className="h-5 w-5 text-amber-500" /> },
              { value: '25+', label: 'Countries', icon: <Globe className="h-5 w-5 text-purple-500" /> }
            ].map((stat, i) => (
              <div key={i} className="space-y-2 group">
                 <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto group-hover:bg-primary/10 transition-colors">
                    {stat.icon}
                 </div>
                 <div className="text-3xl font-extrabold">{stat.value}</div>
                 <div className="text-sm text-muted-foreground font-medium uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
         </div>
      </GlassCard>
    </div>
  );
};

export default PressPage;
