'use client';

import React from 'react';

interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface InsightsCardProps {
  insights: Insight[];
  className?: string;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({
  insights,
  className = '',
}) => {
  const iconMap = {
    success: '🎉',
    warning: '⚠️',
    info: '💡',
  };

  const colorMap = {
    success: 'from-green-500 to-emerald-600',
    warning: 'from-yellow-500 to-orange-600',
    info: 'from-blue-500 to-indigo-600',
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {insights.map((insight, idx) => (
        <div
          key={idx}
          className={`bg-gradient-to-r ${colorMap[insight.type]} text-white rounded-xl p-6`}
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="text-3xl">{iconMap[insight.type]}</span>
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-1">{insight.title}</h4>
              <p className="opacity-90">{insight.message}</p>
            </div>
          </div>
          {insight.action && (
            <button
              onClick={insight.action.onClick}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
            >
              {insight.action.label} →
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default InsightsCard;
