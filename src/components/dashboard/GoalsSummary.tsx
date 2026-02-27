import { CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Target, Crosshair, ChevronRight, Zap, Trophy, ShieldHalf } from 'lucide-react';
import { motion } from 'framer-motion';

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  dueDate: string;
}

interface GoalsSummaryProps {
  goals?: Goal[];
  className?: string;
}

export function GoalsSummary({ goals = [], className }: GoalsSummaryProps) {
  const hasGoals = goals.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className={cn("h-full", className)}
    >
      <div className="glass-card h-full p-8 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-500/10 rounded-2xl border border-pink-500/20 group-hover:scale-110 transition-transform shadow-xl">
              <Crosshair className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Active Missions</h2>
              <p className="text-zinc-600 dark:text-zinc-500 font-bold text-xs uppercase tracking-widest mt-1">Target Acquisition</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="hover:bg-black/5 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white group border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-all rounded-xl">
            <Link href="/goals" className="flex items-center gap-1">
              Command <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {!hasGoals ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 glass rounded-3xl border-black/5 dark:border-white/5 py-12">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 flex items-center justify-center mb-2 shadow-2xl">
                <Target className="w-8 h-8 text-zinc-400 dark:text-zinc-700" />
              </div>
              <div className="text-center">
                <p className="text-zinc-900 dark:text-white font-bold text-lg">No Active Protocols</p>
                <p className="text-zinc-600 dark:text-zinc-500 font-medium text-sm">Initialize goals to start mission tracking.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal, idx) => {
                const percent = Math.round((goal.current / goal.target) * 100);
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + (idx * 0.1) }}
                    className="group relative bg-black/0 dark:bg-white/0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] border border-transparent hover:border-black/5 dark:hover:border-white/5 rounded-2xl p-4 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-3 h-3 text-pink-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                        <span className="text-sm font-black text-zinc-900 dark:text-white group-hover:text-pink-400 transition-colors uppercase tracking-tight truncate max-w-[120px]">
                          {goal.title}
                        </span>
                      </div>
                      <span className="text-xs font-black text-pink-500 tracking-tighter bg-pink-500/10 px-2 py-0.5 rounded-full">
                        {percent}%
                      </span>
                    </div>

                    <div className="relative h-2 w-full bg-zinc-200 dark:bg-zinc-900/50 rounded-full overflow-hidden border border-black/5 dark:border-white/5 mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, percent)}%` }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 1 + (idx * 0.1) }}
                        className="absolute h-full bg-gradient-to-r from-pink-600 to-rose-400 shadow-[0_0_15px_rgba(236,72,153,0.3)] rounded-full"
                      />
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <Zap className="w-2 h-2 text-zinc-700" />
                        <span>{goal.current} / {goal.target}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShieldHalf className="w-2 h-2 text-zinc-700" />
                        <span>Deadline: {goal.dueDate}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

