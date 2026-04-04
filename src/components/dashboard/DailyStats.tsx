'use client';

import React from 'react';
import { Calendar, TrendingUp, Clock, Zap, Target, BarChart3, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Progress } from '@/components/ui/progress';

export const DailyStats = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
           </Button>
           <div className="text-center sm:text-left">
             <h1 className="text-2xl font-bold tracking-tight">Daily Stats</h1>
             <p className="text-sm text-muted-foreground flex items-center gap-1">
               <Calendar className="h-3 w-3" />
               Today, March 30, 2026
             </p>
           </div>
           <Button variant="outline" size="icon" className="h-9 w-9">
              <ChevronRight className="h-4 w-4" />
           </Button>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="px-3 py-1 bg-primary/5 border-primary/20">
             Streak: 12 Days
           </Badge>
           <Button variant="outline" size="sm" className="gap-2">
             <BarChart3 className="h-4 w-4" />
             Weekly View
           </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Focus Time" 
          value="4h 32m" 
          description="+15% from yesterday"
          icon={<Clock className="h-5 w-5 text-blue-500" />}
        />
        <StatCard 
          title="Tasks Completed" 
          value="18" 
          description="Goal: 20"
          icon={<Target className="h-5 w-5 text-green-500" />}
        />
        <StatCard 
          title="Productivity Score" 
          value="94" 
          description="Outstanding efficiency"
          icon={<Zap className="h-5 w-5 text-yellow-500" />}
        />
        <StatCard 
          title="Goals Achieved" 
          value="3" 
          description="Highest this week"
          icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2 p-6 space-y-6">
           <div className="flex items-center justify-between">
             <h3 className="font-semibold text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Hourly Productivity
             </h3>
             <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Info className="h-4 w-4" />
             </Button>
           </div>
           
           <div className="h-[300px] w-full bg-muted/20 rounded-xl relative flex items-end justify-between p-6 gap-2">
              {[45, 60, 30, 85, 95, 70, 50, 40, 25, 45, 65, 80].map((h, i) => (
                <div key={i} className="flex-1 space-y-2 group">
                  <div className="w-full bg-primary/20 rounded-t-lg transition-all group-hover:bg-primary/40 relative" style={{ height: `${h}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 shadow-xl border whitespace-nowrap z-10">
                      {h}% Effort
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center font-mono">
                    {i + 8}h
                  </div>
                </div>
              ))}
           </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-6 bg-gradient-to-br from-background to-primary/5 border-primary/10">
           <h3 className="font-semibold text-lg">Goal Progress Today</h3>
           <div className="space-y-6">
              {[
                { name: 'Coding Session', progress: 85, color: 'bg-blue-500' },
                { name: 'Review Pull Requests', progress: 45, color: 'bg-amber-500' },
                { name: 'Daily Standup', progress: 100, color: 'bg-green-500' },
                { name: 'Bug Fixing', progress: 20, color: 'bg-purple-500' }
              ].map((g) => (
                <div key={g.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground">{g.progress}%</span>
                  </div>
                  <Progress value={g.progress} className="h-2 rounded-full" />
                </div>
              ))}
           </div>

           <div className="pt-4 border-t border-primary/10">
              <Button variant="outline" className="w-full bg-background/50 backdrop-blur hover:bg-primary/5 hover:border-primary/20 transition-all group">
                Add Journal Entry
                <ArrowRight className="h-4 w-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
           </div>
        </GlassCard>
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

export default DailyStats;
