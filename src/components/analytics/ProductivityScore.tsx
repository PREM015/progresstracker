'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ProductivityScoreProps {
  className?: string;
}

interface ScoreData {
  overall: number;
  breakdown: {
    consistency: number;
    volume: number;
    streak: number;
    focus: number;
  };
  trend: 'improving' | 'stable' | 'declining';
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ProductivityResponse {
  score: number;
  scoreBreakdown: {
    consistency: number;
    volume: number;
    streak: number;
    focus: number;
  };
  metrics: {
    activityRate: number;
  };
}

export const ProductivityScore: React.FC<ProductivityScoreProps> = ({
  className = '',
}) => {
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchScore = async () => {
      try {
        const res = await fetch('/api/analytics/productivity?days=30');

        if (!res.ok) {
          throw new Error(`Failed to fetch productivity score: ${res.status}`);
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Received non-JSON response from API");
        }

        const json = (await res.json()) as ApiSuccess<ProductivityResponse>;
        if (!json?.success) throw new Error('API reported failure');

        const overall = json.data?.score || 0;
        const breakdown = json.data?.scoreBreakdown || {
          consistency: 0,
          volume: 0,
          streak: 0,
          focus: 0,
        };

        const trend: ScoreData['trend'] = overall >= 70 ? 'improving' : overall >= 40 ? 'stable' : 'declining';

        if (isMounted) {
          setScoreData({ overall, breakdown, trend });
        }
      } catch (error) {
        console.error('Failed to load productivity score:', error);
        if (isMounted) {
          setScoreData(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchScore();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />;
  }

  if (!scoreData) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={cn("bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 h-full flex flex-col", className)}>
      <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">Productivity Score</h3>

      <div className="text-center mb-8">
        <div className={cn("text-6xl font-bold mb-2", getScoreColor(scoreData.overall))}>
          {scoreData.overall}
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center justify-center gap-2">
          <span>Overall Score</span>
          <span className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            scoreData.trend === 'improving' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              scoreData.trend === 'stable' ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}>
            {scoreData.trend === 'improving' && 'Improving'}
            {scoreData.trend === 'stable' && 'Stable'}
            {scoreData.trend === 'declining' && 'Declining'}
          </span>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {Object.entries(scoreData.breakdown).map(([key, value]) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">{key}</span>
              <span className={cn("font-bold", getScoreColor(value))}>{value}</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full",
                  value >= 80 ? 'bg-green-500' :
                    value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductivityScore;
