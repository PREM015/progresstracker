import { Button } from '@/components/ui/button';
import { PlusCircle, PlayCircle, BarChart3, Settings, Zap, Activity, RefreshCw, ChevronRight, Rocket } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
      className={cn("h-full", className)}
    >
      <div className="glass-card h-full p-8 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20 group-hover:scale-110 transition-transform shadow-xl">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Rapid Access</h2>
              <p className="text-zinc-600 dark:text-zinc-500 font-bold text-xs uppercase tracking-widest mt-1">Operational shortcuts</p>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-xl">
            <Zap className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-700" />
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <ActionButton href="/platforms" icon={PlusCircle} label="Connect Platform" variant="primary" delay={0.9} />
          <ActionButton href="/tracker/new" icon={Activity} label="Log Activity" delay={1.0} />
          <ActionButton href="/connected-platforms" icon={RefreshCw} label="Sync Status" delay={1.1} />
          <ActionButton href="/goals/new" icon={PlayCircle} label="Set Goal" delay={1.2} />
          <ActionButton href="/settings" icon={Settings} label="Settings" delay={1.3} />
        </div>

        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1">
            <span>System V.2.1 Alpha</span>
            <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500" /> Online</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ href, icon: Icon, label, variant = 'secondary', delay = 0 }: { href: string, icon: any, label: string, variant?: 'primary' | 'secondary', delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <Button asChild variant="ghost" className={cn(
        "w-full justify-between h-12 text-xs font-black uppercase tracking-widest transition-all duration-300 rounded-2xl border group px-4",
        variant === 'primary'
          ? "bg-primary text-white border-primary/20 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] shadow-lg"
          : "bg-black/0 dark:bg-white/0 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
      )}>
        <Link href={href} className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <Icon className={cn("mr-3 h-4 w-4 transition-transform group-hover:scale-110", variant === 'secondary' && "text-zinc-600 group-hover:text-primary")} />
            {label}
          </div>
          <ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
        </Link>
      </Button>
    </motion.div>
  );
}

