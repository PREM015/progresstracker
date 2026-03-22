'use client';

import React from 'react';
import { useFavorites } from '@/hooks';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Star, ArrowRight, Trophy, Target, Globe } from 'lucide-react';
import Link from 'next/link';

export default function FavoritesPage() {
  const { favorites, isLoading } = useFavorites();

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">My Favorites</h1>
        <p className="text-zinc-400 max-w-2xl">
          Quick access to your pinned achievements, goals, and platforms.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-zinc-900/50 animate-pulse rounded-xl border border-white/5" />
          ))}
        </div>
      ) : favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((fav) => (
            <GlassCard key={fav.id} className="p-4 hover:border-indigo-500/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    {fav.type === 'achievement' && <Trophy className="w-5 h-5" />}
                    {fav.type === 'goal' && <Target className="w-5 h-5" />}
                    {fav.type === 'platform' && <Globe className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white capitalize">{fav.type}</h3>
                    <p className="text-xs text-zinc-500">Added on {new Date(fav.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" asChild>
                  <Link href={`/dashboard/${fav.type}s`}>
                    View {fav.type} <ArrowRight className="w-3 h-3 ml-2" />
                  </Link>
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-12 text-center border-dashed border-white/10 bg-transparent">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-zinc-900 text-zinc-500">
              <Star className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">No favorites yet</h3>
              <p className="text-zinc-500 mt-1">Start pinning your most important items to see them here.</p>
            </div>
            <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
