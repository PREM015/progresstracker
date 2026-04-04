'use client';

import React from 'react';
import { MessageSquare, Plus, Search, Filter, Clock, CheckCircle2, AlertCircle, ChevronRight, Star } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const FeedbackList = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground">
            Share your thoughts and track your submitted suggestions.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Feedback
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-4">
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center space-y-2 bg-primary/5 border-primary/10">
           <span className="text-2xl font-bold">14</span>
           <span className="text-xs text-muted-foreground uppercase font-semibold">Total Sent</span>
        </GlassCard>
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center space-y-2 bg-green-500/5 border-green-500/10">
           <span className="text-2xl font-bold text-green-600 dark:text-green-500">8</span>
           <span className="text-xs text-muted-foreground uppercase font-semibold">Resolved</span>
        </GlassCard>
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center space-y-2 bg-amber-500/5 border-amber-500/10">
           <span className="text-2xl font-bold text-amber-600 dark:text-amber-500">4</span>
           <span className="text-xs text-muted-foreground uppercase font-semibold">In Review</span>
        </GlassCard>
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center space-y-2 bg-blue-500/5 border-blue-500/10">
           <span className="text-2xl font-bold text-blue-600 dark:text-blue-500">2</span>
           <span className="text-xs text-muted-foreground uppercase font-semibold">Planned</span>
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search feedback history..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              All Status
            </Button>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-4">
        {[
          { id: 1, title: 'Dark mode contrast improvements', status: 'Resolved', category: 'UI/UX', date: '2 days ago', priority: 'High' },
          { id: 2, title: 'GitHub integration occasionally fails', status: 'In Review', category: 'Bug', date: '1 week ago', priority: 'Critical' },
          { id: 3, title: 'Add export to PDF feature', status: 'Planned', category: 'Feature', date: 'Mar 15, 2026', priority: 'Medium' },
          { id: 4, title: 'Mobile app performance layout', status: 'Resolved', category: 'Performance', date: 'Mar 10, 2026', priority: 'Low' }
        ].map((f) => (
          <GlassCard key={f.id} className="p-4 group cursor-pointer hover:border-primary/40 transition-all hover:bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  f.status === 'Resolved' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                  f.status === 'In Review' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                  'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                }`}>
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">{f.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1 font-medium bg-muted px-2 py-0.5 rounded uppercase tracking-wider">{f.category}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {f.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {f.priority}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 shrink-0 px-2 lg:px-4">
                <Badge variant={f.status === 'Resolved' ? 'outline' : 'secondary'} className={
                  f.status === 'Resolved' ? 'border-green-500/50 text-green-600 dark:text-green-400' :
                  f.status === 'In Review' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                }>
                  {f.status}
                </Badge>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      
      <div className="flex justify-center pt-8">
         <Button variant="ghost" className="text-muted-foreground">Show 10 more items</Button>
      </div>
    </div>
  );
};

export default FeedbackList;
