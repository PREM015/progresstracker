'use client';

import React, { ReactNode } from 'react';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color?: string;
    unit?: string;
  }>;
  label?: string;
  className?: string;
  children?: ReactNode;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  className = '',
  children,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  if (children) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`bg-gray-900 text-white rounded-lg shadow-xl p-3 border border-gray-700 ${className}`}
      style={{ maxWidth: '250px' }}
    >
      {label && (
        <div className="font-semibold text-sm mb-2 pb-2 border-b border-gray-700">
          {label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {entry.color && (
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color }}
                ></div>
              )}
              <span className="text-xs text-gray-300">{entry.name}:</span>
            </div>
            <span className="text-sm font-semibold">
              {entry.value}{entry.unit || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartTooltip;
