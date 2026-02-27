'use client';

import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Lightbulb, TrendingUp, Trophy, Flame, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Insight {
  id: string;
  type: 'streak' | 'improvement' | 'decline' | 'milestone' | 'recommendation' | 'warning' | 'celebration' | 'tip';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  color?: string;
}

interface InsightsCardProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface InsightsResponse {
  insights: Insight[];
}

export const InsightsCard: React.FC<InsightsCardProps> = ({
  className = '',
}) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const fetchInsights = async () => {
      try {
        const res = await fetch('/api/analytics/insights?limit=5');

        if (!res.ok) throw new Error(`Failed to fetch insights: ${res.status}`);

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Received non-JSON response from API");
        }

        const json = (await res.json()) as ApiSuccess<InsightsResponse>;
        if (isMounted) {
          setInsights(json.data?.insights || []);
        }
      } catch (error) {
        console.error('Failed to load insights:', error);
        if (isMounted) setInsights([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInsights();

    return () => { isMounted = false; };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'streak': return <Flame className="w-5 h-5" />;
      case 'milestone': return <Trophy className="w-5 h-5" />;
      case 'improvement': return <TrendingUp className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      case 'recommendation': return <Target className="w-5 h-5" />;
      default: return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getColorClass = (type: string, priority: string) => {
    if (priority === 'critical') return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50';

    switch (type) {
      case 'celebration':
      case 'streak':
      case 'milestone':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50';
      case 'improvement':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50';
      case 'warning':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/50';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50';
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className={cn("bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center", className)}>
        <Lightbulb className="w-8 h-8 mx-auto mb-3 text-zinc-400" />
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No insights yet</h4>
        <p className="text-xs text-zinc-500 mt-1">Keep using the platform to generate personalized insights.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {insights.map((insight) => (
        <div
          key={insight.id}
          className={cn(
            "rounded-xl p-5 border transition-all hover:shadow-sm",
            getColorClass(insight.type, insight.priority)
          )}
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-white/50 dark:bg-black/20 rounded-full shrink-0">
              {getIcon(insight.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm mb-1">{insight.title}</h4>
              <p className="text-sm opacity-90 leading-relaxed">{insight.message}</p>

              {insight.actionUrl && (
                <button
                  onClick={() => router.push(insight.actionUrl!)}
                  className="mt-3 text-xs font-semibold hover:underline flex items-center gap-1"
                >
                  {insight.actionLabel || 'View Details'} →
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InsightsCard;
