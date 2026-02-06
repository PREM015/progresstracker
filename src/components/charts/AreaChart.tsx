'use client';

import React from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: DataPoint[];
  className?: string;
  height?: number;
  title?: string;
  color?: string;
  fillOpacity?: number;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  className = '',
  height = 300,
  title,
  color = '#60A5FA',
  fillOpacity = 0.3,
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
          const value = Math.round(minValue + ratio * range);
          return (
            <g key={idx}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#6B7280"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#areaGradient)"
        />

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
        {points.map((point, idx) => (
          <g key={idx}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="white"
              stroke={color}
              strokeWidth="2"
              className="hover:r-6 cursor-pointer transition-all"
            />
            {/* X-axis labels */}
            {idx % Math.ceil(data.length / 8) === 0 && (
              <text
                x={point.x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                fontSize="10"
                fill="#6B7280"
              >
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Stats */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-600">
        <div>Points: {data.length}</div>
        <div>Max: {maxValue}</div>
        <div>Min: {minValue}</div>
        <div>Avg: {Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length)}</div>
      </div>
    </div>
  );
};



export default AreaChart;
