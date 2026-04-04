'use client';

import React from 'react';
import { Trophy, Medal, Search, Filter, Globe, Code2, Cpu, Database, LayoutGrid, CheckCircle2, ArrowRight, User, TrendingUp, Zap, Star } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const PublicLeaderboard = () => {
  return (
    <div className="space-y-16 py-12 px-6 max-w-7xl mx-auto animate-in fade-in duration-700">
      <section className="text-center space-y-6">
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-500/10 border-4 border-amber-500/20 text-amber-600 dark:text-amber-500 shadow-2xl transform rotate-12 transition-transform hover:rotate-0 mb-4 animate-bounce-slow">
           <Trophy className="h-12 w-12" />
        </div>
        <h1 className="text-5xl font-black tracking-tighter lg:text-7xl">
           Global <span className="text-primary italic">Champions</span> 2026
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
           The top 100 most productive developers in the Progress Tracker ecosystem. Updated every hour.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {[
          { rank: 2, name: 'Sarah Miller', score: '38,400 pts', icon: <Medal className="h-8 w-8 text-zinc-400" />, color: 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' },
          { rank: 1, name: 'Alex Johnson', score: '42,150 pts', icon: <Trophy className="h-10 w-10 text-amber-500" />, color: 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_50px_-12px_rgba(245,158,11,0.3)] scale-110 z-10' },
          { rank: 3, name: 'Devin Chen', score: '35,900 pts', icon: <Medal className="h-8 w-8 text-amber-700" />, color: 'bg-amber-700/10 border-amber-700/20' }
        ].sort((a, b) => (a.rank === 1 ? -1 : b.rank === 1 ? 1 : a.rank - b.rank)).map((top, i) => (
          <GlassCard key={i} className={`p-8 space-y-4 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-2 cursor-pointer ${top.color}`}>
             <div className="relative">
                <div className="w-20 h-20 rounded-full bg-background border-4 border-muted flex items-center justify-center font-black text-2xl overflow-hidden shadow-inner">
                   <User className="h-10 w-10 text-muted-foreground opacity-50" />
                </div>
                <div className="absolute -top-6 -right-6">
                   {top.icon}
                </div>
             </div>
             <div className="space-y-1">
                <Badge variant="outline" className="text-[10px] h-4 uppercase tracking-tighter opacity-70">Rank #{top.rank}</Badge>
                <h3 className="text-2xl font-black tracking-tight group-hover:text-primary transition-colors">{top.name}</h3>
                <p className="text-lg font-bold text-primary italic">{top.score}</p>
             </div>
             <div className="flex gap-2 pt-2">
                <Badge className="bg-zinc-950 text-white hover:bg-zinc-900 gap-1.5 flex items-center">
                   <FaGithub className="h-3 w-3" />
                   GitHub
                </Badge>
                <Badge className="bg-amber-500 text-white hover:bg-amber-600">LeetCode</Badge>
             </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-8 space-y-8 bg-black/[0.02] dark:bg-white/[0.02] border-primary/5 shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-48 w-48 rotate-12" />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 border-b pb-6">
            <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 italic">
               <Globe className="h-7 w-7 text-primary" />
               Live Standings
            </h2>
            <div className="flex flex-wrap gap-4 items-center">
               <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input placeholder="Search developer..." className="pl-9 h-10 bg-background/50 border-primary/10" />
               </div>
               <Button variant="outline" className="h-10 gap-2 font-bold backdrop-blur">
                  <Filter className="h-4 w-4" />
                  All Platforms
               </Button>
            </div>
         </div>
         
         <Table>
            <TableHeader className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground italic">
               <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>Developer</TableHead>
                  <TableHead className="hidden md:table-cell">Streaks</TableHead>
                  <TableHead className="hidden md:table-cell text-center">Platforms</TableHead>
                  <TableHead className="text-right">Progress Score</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody className="text-sm font-medium">
               {[
                 { rank: 4, name: 'Jessica Wang', streak: '142 Days', points: '32,100 pts', platforms: 5 },
                 { rank: 5, name: 'Michael Smith', streak: '89 Days', points: '29,450 pts', platforms: 4 },
                 { rank: 6, name: 'Emily Brown', streak: '210 Days', points: '27,800 pts', platforms: 6 },
                 { rank: 7, name: 'Chris Lee', streak: '45 Days', points: '25,600 pts', platforms: 3 },
                 { rank: 8, name: 'Anna Garcia', streak: '12 Days', points: '22,900 pts', platforms: 2 }
               ].map((row) => (
                 <TableRow key={row.rank} className="hover:bg-primary/5 transition-all border-muted/50 group cursor-pointer h-16">
                    <TableCell className="font-black text-lg italic text-muted-foreground opacity-60 group-hover:text-primary group-hover:opacity-100 transition-all">#{row.rank}</TableCell>
                    <TableCell>
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted/50 border border-muted flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-primary/10 transition-colors">
                             {row.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                             <h4 className="font-bold tracking-tight group-hover:text-primary transition-colors">{row.name}</h4>
                             <p className="text-[10px] text-muted-foreground italic uppercase">Fullstack Artisan</p>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                       <div className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-bold italic">{row.streak}</span>
                       </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                       <div className="flex justify-center -space-x-2">
                          {Array.from({ length: row.platforms }).map((_, i) => (
                            <div key={i} className="w-7 h-7 rounded-full bg-zinc-950 border-2 border-background flex items-center justify-center shadow-lg transform hover:scale-125 transition-transform">
                               <Globe className="h-3 w-3 text-white" />
                            </div>
                          ))}
                          {row.platforms > 3 && (
                            <div className="w-7 h-7 rounded-full bg-primary border-2 border-background flex items-center justify-center text-[8px] font-black text-white z-10">
                               +{row.platforms - 3}
                            </div>
                          )}
                       </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <span className="font-black text-lg text-primary tracking-tighter italic">{row.points}</span>
                    </TableCell>
                 </TableRow>
               ))}
            </TableBody>
         </Table>

         <div className="text-center pt-8">
            <Button variant="outline" size="lg" className="px-16 h-12 text-lg font-black italic tracking-tighter border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all shadow-xl shadow-primary/10">
               Load Global Standings
               <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
         </div>
      </GlassCard>

      <GlassCard className="p-12 text-center space-y-8 bg-zinc-950 dark:bg-zinc-900 border-zinc-800 shadow-2xl relative overflow-hidden group">
         <div className="absolute inset-0 opacity-10 pointer-events-none" />
         <div className="relative z-10 space-y-6">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Join the Hall of Fame</h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed italic">
               Think you can beat the best? Connect your developer profiles, set your goals, and start climbing the global leaderboard today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
               <Button size="lg" className="h-16 px-12 text-xl font-black italic tracking-tighter gap-4 shadow-2xl shadow-primary/20 hover:scale-105 transition-all">
                  Get Started for Free
                  <Zap className="h-6 w-6 fill-current" />
               </Button>
               <Button size="lg" variant="outline" className="h-16 px-12 text-xl font-black italic tracking-tighter backdrop-blur text-white border-zinc-700 hover:bg-zinc-800">
                  <Star className="h-6 w-6" />
                  Compare Rankings
               </Button>
            </div>
         </div>
      </GlassCard>
    </div>
  );
};

export default PublicLeaderboard;
