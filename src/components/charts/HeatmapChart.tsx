'use client';

import React from 'react';

interface HeatmapDataPoint {
  x: number; // column
  y: number; // row
  value: number;
  label?: string;
}

interface HeatmapChartProps {
  data: HeatmapDataPoint[];
  xLabels: string[];
  yLabels: string[];
  className?: string;
  cellSize?: number;
  title?: string;
  colorRange?: [string, string];
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  xLabels,
  yLabels,
  className = '',
  cellSize = 40,
  title,
  colorRange = ['#FEF3C7', '#DC2626'],
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={className}>
        <p className="text-gray-500 text-center py-8">No heatmap data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const getColor = (value: number) => {
    const intensity = (value - minValue) / range;
    // Interpolate between colorRange[0] (low) and colorRange[1] (high)
    return `rgba(220, 38, 38, ${0.1 + intensity * 0.9})`; // Red with varying opacity
  };

  const width = xLabels.length * cellSize + 100;
  const height = yLabels.length * cellSize + 100;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      {title && <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>}

      <div className="overflow-x-auto">
        <svg width={width} height={height}>
          {/* Y-axis labels */}
          {yLabels.map((label, idx) => (
            <text
              key={`y-${idx}`}
              x="50"
              y={70 + idx * cellSize + cellSize / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="12"
              fill="#6B7280"
            >
              {label}
            </text>
          ))}

          {/* X-axis labels */}
          {xLabels.map((label, idx) => (
            <text
              key={`x-${idx}`}
              x={60 + idx * cellSize + cellSize / 2}
              y="40"
              textAnchor="middle"
              fontSize="12"
              fill="#6B7280"
            >
              {label}
            </text>
          ))}

          {/* Heatmap cells */}
          {data.map((point, idx) => {
            const x = 60 + point.x * cellSize;
            const y = 50 + point.y * cellSize;
            const color = getColor(point.value);

            return (
              <g key={idx}>
                <rect
                  x={x}
                  y={y}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  fill={color}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  className="hover:stroke-gray-400 cursor-pointer transition-all"
                  rx="4"
                />
                {point.value > 0 && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill={point.value / maxValue > 0.5 ? '#fff' : '#374151'}
                  >
                    {point.value}
                  </text>
                )}
                <title>{`${xLabels[point.x]} - ${yLabels[point.y]}: ${point.value}`}</title>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-xs text-gray-600">Low</span>
        <div className="flex gap-1">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
            <div
              key={idx}
              className="w-8 h-4 rounded"
              style={{
                backgroundColor: `rgba(220, 38, 38, ${0.1 + ratio * 0.9})`
              }}
            ></div>
          ))}
        </div>
        <span className="text-xs text-gray-600">High</span>
        <span className="text-xs text-gray-500 ml-4">Max: {maxValue}</span>
      </div>
    </div>
  );
};

export default HeatmapChart;
