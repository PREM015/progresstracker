'use client';

import React, { useState, useEffect } from 'react';

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
        const json = (await res.json()) as ApiSuccess<PredictionsResponse>;
        if (!res.ok || !json?.success) throw new Error('Failed to fetch predictions');

        if (isMounted) {
          setPredictions(json.data?.predictions || []);
        }
      } catch (error) {
        console.error('Failed to load predictions:', error);
        if (isMounted) {
          setPredictions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPredictions();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  }

  return (
    <div className={`bg-gradient-to-br from-indigo-600 to-slate-800 text-white rounded-xl p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-xl font-bold">Predictions</h3>
        <p className="text-sm text-white/70">Data-driven projections</p>
      </div>

      <div className="space-y-4">
        {predictions.map((pred, idx) => (
          <div key={idx} className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{pred.title}</span>
              <span className="text-xs px-2 py-1 bg-white/20 rounded">{pred.timeframe}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold">{pred.prediction}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full"
                  style={{ width: `${pred.confidence}%` }}
                />
              </div>
              <span className="text-xs opacity-75">{pred.confidence}% confidence</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PredictionsCard;
