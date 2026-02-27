'use client';

import React from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: DataPoint[];
  className?: string;
  height?: number;
  showValues?: boolean;
  title?: string;
  horizontal?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  className = '',
  height = 300,
  showValues = true,
  title,
  horizontal = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const defaultColors = [
    '#60A5FA', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#10B981', '#F97316', '#06B6D4', '#6366F1'
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      {title && <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>}

      <div style={{ height }} className="relative">
        {horizontal ? (
          // Horizontal bars
          <div className="space-y-4 h-full flex flex-col justify-around">
            {data.map((item, idx) => {
              const percentage = (item.value / maxValue) * 100;
              const color = item.color || defaultColors[idx % defaultColors.length];

              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-24 text-sm font-medium text-gray-700 text-right truncate">
                    {item.label}
                  </div>
                  <div className="flex-1 relative">
                    <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      >
                        {showValues && percentage > 15 && (
                          <span className="text-xs font-semibold text-white">
                            {item.value}
                          </span>
                        )}
                      </div>
                    </div>
                    {showValues && percentage <= 15 && (
                      <span className="absolute left-2 top-1 text-xs font-semibold text-gray-700">
                        {item.value}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Vertical bars
          <div className="h-full flex items-end justify-around gap-2">
            {data.map((item, idx) => {
              const percentage = (item.value / maxValue) * 100;
              const color = item.color || defaultColors[idx % defaultColors.length];

              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full relative flex-1 flex flex-col justify-end">
                    <div
                      className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer relative group"
                      style={{
                        height: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    >
                      {showValues && (
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700">
                          {item.value}
                        </div>
                      )}
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          {item.label}: {item.value}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2 text-center truncate w-full">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarChart;
