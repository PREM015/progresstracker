'use client';

import React from 'react';
import { Star, LayoutGrid, List, Search, Filter } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const FavoritesPage = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Favorites</h1>
          <p className="text-muted-foreground">
            Quickly access your most important goals and achievements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search favorites..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Badge variant="secondary" className="px-3 py-1">
              12 Items
            </Badge>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <GlassCard key={i} className="group overflow-hidden transition-all hover:shadow-lg">
            <div className="aspect-video w-full bg-muted/50 p-4 flex items-center justify-center relative">
               <div className="absolute top-2 right-2">
                 <Button variant="ghost" size="icon" className="text-yellow-500">
                   <Star className="h-5 w-5 fill-current" />
                 </Button>
               </div>
               <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                 <Star className="h-6 w-6 text-primary" />
               </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Favorite Goal {i}</h3>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                This is a placeholder for your favorited goal description. You can track progress and stay motivated.
              </p>
              <div className="pt-4 flex items-center justify-between">
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[65%]" />
                </div>
                <span className="ml-4 text-xs font-medium text-muted-foreground">65%</span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Star className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No more favorites?</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Try searching for goals or platforms to add more items to your favorites list.
          </p>
          <Button variant="outline">Browse All Goals</Button>
        </div>
      </div>
    </div>
  );
};

export default FavoritesPage;
