'use client';

import  Card  from '@/components/ui/Card';
import { Lightbulb, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface Insight {
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  icon: string;
}

interface InsightsPanelProps {
  insights: Insight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  // ... rest of the code remains the same
  if (!insights || insights.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          AI-Generated Insights
        </h3>
        <p className="text-gray-500 text-center py-4">
          Complete more activities to see AI-generated insights!
        </p>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'tip':
        return <Lightbulb className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getColors = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      case 'tip':
        return 'bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-yellow-500" />
        AI-Generated Insights
      </h3>
      
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getColors(insight.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{getIcon(insight.type)}</div>
              <div className="flex-1">
                <p className="font-semibold mb-1">{insight.title}</p>
                <p className="text-sm opacity-90">{insight.description}</p>
              </div>
              <span className="text-2xl">{insight.icon}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}