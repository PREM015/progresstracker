'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Prediction {
  title: string;
  prediction: string | number;
  confidence: number;
  timeframe: string;
}

interface PredictionsCardProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface PredictionsResponse {
  predictions: Prediction[];
}

export const PredictionsCard: React.FC<PredictionsCardProps> = ({
  className = '',
}) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchPredictions = async () => {
      try {
        const res = await fetch('/api/analytics/predictions?includeFactors=false');

        if (!res.ok) throw new Error(`Failed to fetch predictions: ${res.status}`);

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Received non-JSON response from API");
        }

        const json = (await res.json()) as ApiSuccess<PredictionsResponse>;
        if (isMounted) {
          setPredictions(json.data?.predictions || []);
        }
      } catch (error) {
        console.error('Failed to load predictions:', error);
        if (isMounted) setPredictions([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPredictions();

    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return <Skeleton className={cn("h-64 w-full rounded-xl", className)} />;
  }

  return (
    <Card className={cn("border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden", className)}>
      <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">AI Predictions</CardTitle>
            <CardDescription className="text-zinc-500">Based on your recent performance</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {predictions.map((pred, idx) => (
            <div key={idx} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{pred.title}</h4>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">{pred.timeframe}</span>
                </div>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{pred.prediction}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>Confidence</span>
                  <span>{pred.confidence}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${pred.confidence}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {predictions.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Not enough data for predictions yet.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictionsCard;
