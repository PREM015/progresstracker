'use client';

import React from 'react';
import { Search, Filter, X, LayoutGrid, List, SlidersHorizontal, ArrowRight, History } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export const SearchPage = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search</h1>
          <p className="text-muted-foreground">
            Search across your goals, achievements, and connected platforms.
          </p>
        </div>
        
        <GlassCard className="p-4 md:p-6 bg-primary/5 border-primary/20 backdrop-blur-xl">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-6 w-6 text-primary" />
            <Input 
              className="h-14 pl-12 text-lg bg-background/50 border-primary/20 focus-visible:ring-primary shadow-inner"
              placeholder="Type to search anything..."
              autoFocus
            />
            <Button variant="ghost" size="icon" className="absolute right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-6">
          <GlassCard className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </h3>
              <Button variant="link" size="sm" className="h-auto p-0 text-primary">Reset</Button>
            </div>
            
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Category</label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">All</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors">Goals</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors">Achievements</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors">Platforms</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Source</label>
                <div className="space-y-2">
                   {['LeetCode', 'GitHub', 'LinkedIn', 'Internal'].map(s => (
                     <div key={s} className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer hover:text-primary transition-colors">
                       <input type="checkbox" className="rounded border-muted-foreground/30 accent-primary" />
                       <span>{s}</span>
                     </div>
                   ))}
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full">Apply Filters</Button>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 space-y-4 bg-muted/30">
             <h3 className="font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Searches
             </h3>
             <ul className="space-y-2 text-sm text-muted-foreground">
               <li className="flex items-center justify-between group cursor-pointer hover:text-foreground">
                 <span>"Next.js optimization"</span>
                 <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
               </li>
               <li className="flex items-center justify-between group cursor-pointer hover:text-foreground">
                 <span>"GitHub stats 2024"</span>
                 <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
               </li>
               <li className="flex items-center justify-between group cursor-pointer hover:text-foreground">
                 <span>"LeetCode streak"</span>
                 <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
               </li>
             </ul>
          </GlassCard>
        </aside>

        <main className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between border-b pb-1">
              <TabsList className="bg-transparent h-auto p-0 gap-6 border-none">
                <TabsTrigger value="all" className="p-0 pb-2 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none shadow-none">Everything</TabsTrigger>
                <TabsTrigger value="goals" className="p-0 pb-2 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none shadow-none">Goals</TabsTrigger>
                <TabsTrigger value="achievements" className="p-0 pb-2 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none shadow-none">Achievements</TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2 mb-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="all" className="space-y-4 mt-6">
              {[1, 2, 3].map(i => (
                <GlassCard key={i} className="flex p-4 gap-4 items-center group transition-all hover:translate-x-1 hover:border-primary/30">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <LayoutGrid className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary tracking-wide uppercase">Goal</span>
                      <span className="text-xs text-muted-foreground">• Oct 24, 2024</span>
                    </div>
                    <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">Build a Next.js Portfolio Project {i}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">Track your progress as you build a high-performance portfolio with Next.js and Tailwind CSS.</p>
                  </div>
                  <Button variant="outline" size="sm" className="hidden sm:flex">View Details</Button>
                </GlassCard>
              ))}

              <div className="py-12 text-center text-muted-foreground">
                 <p>Found 12 more results. <span className="text-primary cursor-pointer hover:underline font-medium">Load more</span></p>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default SearchPage;
