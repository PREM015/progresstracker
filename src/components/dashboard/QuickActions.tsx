'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, PlayCircle, BarChart3, Settings, Zap, Activity, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <Card className={cn("h-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded text-indigo-600 dark:text-indigo-400">
            <Zap className="w-4 h-4" />
          </div>
          <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Quick Actions</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <ActionButton href="/platforms" icon={PlusCircle} label="Connect Platform" variant="primary" />
        <ActionButton href="/tracker/new" icon={Activity} label="Log Activity" />
        <ActionButton href="/connected-platforms" icon={RefreshCw} label="Sync Status" />
        <ActionButton href="/goals/new" icon={PlayCircle} label="Set Goal" />
        <ActionButton href="/settings" icon={Settings} label="Settings" />
      </CardContent>
    </Card>
  );
}

function ActionButton({ href, icon: Icon, label, variant = 'secondary' }: { href: string, icon: any, label: string, variant?: 'primary' | 'secondary' }) {
  return (
    <Button asChild variant="outline" className={cn(
      "w-full justify-start h-11 text-sm font-medium transition-all duration-200",
      variant === 'primary'
        ? "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent hover:shadow-md hover:shadow-indigo-500/20"
        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50"
    )}>
      <Link href={href}>
        <Icon className={cn("mr-3 h-4 w-4", variant === 'secondary' && "text-zinc-400 dark:text-zinc-500")} />
        {label}
      </Link>
    </Button>
  );
}
