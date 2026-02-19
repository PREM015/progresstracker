import { CardHeader, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Target, Crosshair, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  dueDate: string;
}

interface GoalsSummaryProps {
  goals?: Goal[];
}

export function GoalsSummary({ goals = [], className }: GoalsSummaryProps & { className?: string }) {
  return (
    <GlassCard className={cn("w-full !bg-black/60 !border-white/10 relative overflow-hidden", className)} glowColor="#ec4899">
      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] pointer-events-none" />

      <div className="p-6 relative z-10">
        <div className="flex flex-row items-center justify-between mb-6 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
              <Crosshair className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <CardTitle className="text-white font-mono tracking-wide uppercase text-sm">Active Missions</CardTitle>
              <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Target Acquisition</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="hover:bg-pink-500/10 hover:text-pink-400 text-xs font-mono uppercase tracking-wider group">
            <Link href="/goals">
              View All <ChevronRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <div className="space-y-4">
          {goals.length === 0 ? (
            <EmptyState
              title="NO ACTIVE MISSIONS"
              description="Initialize new protocols to begin tracking."
              variant="small"
              icon={Target}
            />
          ) : (
            goals.map((goal) => {
              const percent = Math.round((goal.current / goal.target) * 100);
              return (
                <div key={goal.id} className="group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-pink-500/30 rounded-lg p-3 transition-all duration-300">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-bold text-gray-200 truncate max-w-[150px] sm:max-w-xs group-hover:text-pink-400 transition-colors font-mono">{goal.title}</span>
                    <span className="text-pink-500 font-mono font-bold text-xs">{percent}%</span>
                  </div>

                  <div className="relative h-1.5 w-full bg-gray-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="absolute h-full bg-gradient-to-r from-pink-600 to-rose-600 transition-all duration-1000 ease-out group-hover:shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>{goal.current} / {goal.target}</span>
                    <span className="uppercase tracking-widest">DUE: {goal.dueDate}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </GlassCard>
  );
}
