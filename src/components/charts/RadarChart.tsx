'use client';

import React from 'react';

interface RadarDataPoint {
  label: string;
  value: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  className?: string;
  size?: number;
  title?: string;
  color?: string;
  maxValue?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  className = '',
  size = 300,
  title,
  color = '#60A5FA',
  maxValue,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: size }}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const max = maxValue || Math.max(...data.map(d => d.value));
  const center = size / 2;
  const radius = (size / 2) - 60;
  const levels = 5;

  // Calculate points for the radar chart
  const points = data.map((item, idx) => {
    const angle = (Math.PI * 2 * idx) / data.length - Math.PI / 2;
    const normalized = item.value / max;
    const x = center + radius * normalized * Math.cos(angle);
    const y = center + radius * normalized * Math.sin(angle);
    return { x, y, angle, ...item };
  });

  const radarPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  // Generate concentric circles for grid
  const gridCircles = Array.from({ length: levels }, (_, i) => {
    const r = (radius / levels) * (i + 1);
    return r;
  });

  // Generate axes lines
  const axes = data.map((_, idx) => {
    const angle = (Math.PI * 2 * idx) / data.length - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y };
  });

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      {title && <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>}

      <svg width={size} height={size} className="mx-auto">
        {/* Grid circles */}
        {gridCircles.map((r, idx) => (
          <circle
            key={`circle-${idx}`}
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Axes */}
        {axes.map((axis, idx) => (
          <line
            key={`axis-${idx}`}
            x1={center}
            y1={center}
            x2={axis.x}
            y2={axis.y}
            stroke="#D1D5DB"
            strokeWidth="1"
          />
        ))}

        {/* Data area */}
        <path
          d={radarPath}
          fill={color}
          fillOpacity="0.3"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, idx) => (
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
          </g>
        ))}

        {/* Labels */}
        {points.map((point, idx) => {
          const labelAngle = point.angle;
          const labelRadius = radius + 30;
          const labelX = center + labelRadius * Math.cos(labelAngle);
          const labelY = center + labelRadius * Math.sin(labelAngle);

          return (
            <text
              key={`label-${idx}`}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill="#374151"
              fontWeight="500"
            >
              {point.label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
            <span className="text-gray-700">{item.label}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadarChart;
