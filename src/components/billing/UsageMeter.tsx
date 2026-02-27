'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UsageMeterProps {
  className?: string;
  onUpgrade?: () => void;
}

export default function UsageMeter({ className, onUpgrade }: UsageMeterProps) {
  const { usage, isLoadingUsage, error, isFree } = useSubscription();

  if (isLoadingUsage) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    );
  }

  if (error || !usage) {
    return null; // Don't show if failed or no data
  }

  const { platforms, exports, apiRequests } = usage;

  const renderMeter = (
    label: string,
    used: number,
    limit: number,
    percentage: number,
    colorClass: string = 'bg-indigo-500'
  ) => {
    const isOverLimit = used >= limit;

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400 font-medium">{label}</span>
          <span className={`${isOverLimit ? 'text-red-500 font-bold' : 'text-zinc-300'}`}>
            {used} / {limit === -1 ? '∞' : limit}
          </span>
        </div>
        <Progress value={percentage} className="h-2" indicatorClassName={isOverLimit ? 'bg-red-500' : colorClass} />
      </div>
    );
  };

  return (
    <Card className={`${className} bg-zinc-900 border-zinc-800`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex justify-between items-center">
          Usage & Limits
          {isFree && onUpgrade && (
            <Button variant="ghost" size="sm" onClick={onUpgrade} className="text-xs text-indigo-400 hover:text-indigo-300 h-auto p-0 hover:bg-transparent">
              Increase Limits
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {renderMeter('Connected Platforms', platforms.used, platforms.limit, platforms.percentage, 'bg-emerald-500')}
        {renderMeter('Monthly Exports', exports.used, exports.limit, exports.percentage, 'bg-blue-500')}
        {renderMeter('Daily API Requests', apiRequests.used, apiRequests.limit, apiRequests.percentage, 'bg-purple-500')}

        {(platforms.percentage >= 90 || exports.percentage >= 90) && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-500">Approaching Limits</p>
              <p className="text-xs text-zinc-400">
                You're nearing your subscription limits. Upgrade now to avoid interruptions.
              </p>
              {onUpgrade && (
                <Button
                  onClick={onUpgrade}
                  variant="link"
                  className="text-yellow-500 p-0 h-auto text-xs underline"
                >
                  Upgrade Plan
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
