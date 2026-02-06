'use client';

import React from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface LineChartProps {
  data: DataPoint[];
  className?: string;
  height?: number;
  showDots?: boolean;
  showArea?: boolean;
  title?: string;
  color?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  className = '',
  height = 300,
  showDots = true,
  showArea = false,
  title,
  color = '#60A5FA',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const width = 600;
  const chartHeight = height - 60;
  const padding = 40;

  const points = data.map((item, idx) => {
    const x = padding + (idx * (width - padding * 2)) / (data.length - 1 || 1);
    const y = chartHeight - padding - ((item.value - minValue) / range) * (chartHeight - padding * 2);
    return { x, y, ...item };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${chartHeight - padding} L${padding},${chartHeight - padding} Z`;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      {title && <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>}

      <svg viewBox={`0 0 ${width} ${chartHeight}`} className="w-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
          return (
            <g key={idx}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#6B7280"
              >
                {Math.round(minValue + ratio * range)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {showArea && (
          <path
            d={areaPath}
            fill={color}
            fillOpacity="0.2"
          />
        )}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {showDots && points.map((point, idx) => (
          <g key={idx}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="white"
              stroke={color}
              strokeWidth="3"
              className="hover:r-7 cursor-pointer transition-all"
            />
            {/* Label */}
            <text
              x={point.x}
              y={chartHeight - padding + 20}
              textAnchor="middle"
              fontSize="10"
              fill="#6B7280"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
          <span>Data points: {data.length}</span>
        </div>
        <div>Max: {maxValue}</div>
        <div>Min: {minValue}</div>
      </div>
    </div>
  );
};

export default LineChart;
