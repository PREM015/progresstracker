'use client';

import React from 'react';
import { Briefcase, ArrowRight, MapPin, Clock, Zap, Users, Globe, Rocket, Heart } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const CareersPage = () => {
  return (
    <div className="space-y-16 py-12 px-6 max-w-7xl mx-auto">
      <section className="text-center space-y-6">
        <Badge variant="outline" className="px-4 py-1 border-primary/20 bg-primary/5 text-primary">
          We're Hiring!
        </Badge>
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
          Build the Future of <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Developer Productivity</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Join a remote-first team of builders, creators, and lifelong learners on a mission to help everyone build better.
        </p>
        <div className="pt-4 flex flex-wrap justify-center gap-4">
           <Button size="lg" className="h-12 px-8 text-lg font-semibold gap-2">
             View Openings
             <ArrowRight className="h-5 w-5" />
           </Button>
           <Button size="lg" variant="outline" className="h-12 px-8 text-lg font-semibold">
             Our Culture
           </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: 'Remote-First', description: 'Work from anywhere in the world. We offer home office stipends.', icon: <Globe className="h-6 w-6 text-blue-500" /> },
          { title: 'Health & Wellness', description: 'Comprehensive insurance for you and your family.', icon: <Heart className="h-6 w-6 text-red-500" /> },
          { title: 'Learn & Grow', description: 'Education budget for books, courses, and conferences.', icon: <Zap className="h-6 w-6 text-amber-500" /> }
        ].map((benefit, i) => (
          <GlassCard key={i} className="p-8 space-y-4 hover:border-primary/30 transition-all group">
             <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
               {benefit.icon}
             </div>
             <h3 className="text-xl font-bold">{benefit.title}</h3>
             <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
          </GlassCard>
        ))}
      </div>

      <section className="space-y-8">
        <div className="flex flex-col gap-4 border-b pb-8">
           <h2 className="text-3xl font-bold">Open Positions</h2>
           <p className="text-muted-foreground">Don't see a role that fits? <span className="text-primary cursor-pointer hover:underline">Send us a speculative application!</span></p>
        </div>
        
        <div className="space-y-4">
           {[
             { title: 'Senior Fullstack Engineer', dept: 'Engineering', location: 'Remote', type: 'Full-time' },
             { title: 'Product UI/UX Designer', dept: 'Design', location: 'Remote', type: 'Full-time' },
             { title: 'Growth Marketing Lead', dept: 'Marketing', location: 'Remote', type: 'Full-time' },
             { title: 'Customer Support Engineer', dept: 'Operations', location: 'Remote', type: 'Full-time' }
           ].map((job, i) => (
             <GlassCard key={i} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-primary/5 cursor-pointer border-transparent hover:border-primary/20">
                <div className="space-y-2">
                   <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">{job.title}</h3>
                   <div className="flex flex-wrap gap-3 text-sm text-muted-foreground font-medium">
                      <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {job.dept}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {job.type}</span>
                   </div>
                </div>
                <Button variant="outline" className="gap-2 self-start md:self-center">
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
             </GlassCard>
           ))}
        </div>
      </section>

      <GlassCard className="p-12 text-center space-y-6 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
         <Rocket className="h-12 w-12 text-primary mx-auto mb-4" />
         <h2 className="text-3xl font-bold">Still Curious?</h2>
         <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
           Learn more about how we work, our values, and what it's like to be part of the team on our public handbook.
         </p>
         <Button variant="link" size="lg" className="text-lg font-bold text-primary hover:underline">
           Read the Team Handbook
         </Button>
      </GlassCard>
    </div>
  );
};

export default CareersPage;
