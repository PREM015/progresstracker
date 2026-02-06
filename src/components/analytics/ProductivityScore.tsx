'use client';

import React, { useState, useEffect } from 'react';

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
        const json = (await res.json()) as ApiSuccess<ProductivityResponse>;
        if (!res.ok || !json?.success) throw new Error('Failed to fetch productivity score');

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
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Productivity Score</h3>

      <div className="text-center mb-8">
        <div className={`text-6xl font-bold mb-2 ${getScoreColor(scoreData.overall)}`}>
          {scoreData.overall}
        </div>
        <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
          <span>Overall Score</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${scoreData.trend === 'improving' ? 'bg-green-100 text-green-700' :
              scoreData.trend === 'stable' ? 'bg-gray-100 text-gray-700' :
                'bg-red-100 text-red-700'
            }`}
          >
            {scoreData.trend === 'improving' && 'Improving'}
            {scoreData.trend === 'stable' && 'Stable'}
            {scoreData.trend === 'declining' && 'Declining'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(scoreData.breakdown).map(([key, value]) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium text-gray-700 capitalize">{key}</span>
              <span className={`font-bold ${getScoreColor(value)}`}>{value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${value >= 80 ? 'bg-green-500' :
                    value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
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
