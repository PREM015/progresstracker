'use client';

import React from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: DataPoint[];
  className?: string;
  size?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  title?: string;
  donut?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  className = '',
  size = 300,
  showLabels = true,
  showLegend = true,
  title,
  donut = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: size }}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const defaultColors = [
    '#60A5FA', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#10B981', '#F97316', '#06B6D4', '#6366F1'
  ];

  const center = size / 2;
  const radius = (size / 2) - 20;
  const donutInnerRadius = donut ? radius * 0.6 : 0;

  let currentAngle = -90;
  const slices = data.map((item, idx) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    let path;
    if (donut) {
      const innerX1 = center + donutInnerRadius * Math.cos(startRad);
      const innerY1 = center + donutInnerRadius * Math.sin(startRad);
      const innerX2 = center + donutInnerRadius * Math.cos(endRad);
      const innerY2 = center + donutInnerRadius * Math.sin(endRad);

      path = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${innerX2} ${innerY2}
        A ${donutInnerRadius} ${donutInnerRadius} 0 ${largeArc} 0 ${innerX1} ${innerY1}
        Z
      `;
    } else {
      path = `
        M ${center} ${center}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        Z
      `;
    }

    // Label position (middle of the slice)
    const labelAngle = (startAngle + endAngle) / 2;
    const labelRad = (labelAngle * Math.PI) / 180;
    const labelRadius = donut ? (radius + donutInnerRadius) / 2 : radius * 0.7;
    const labelX = center + labelRadius * Math.cos(labelRad);
    const labelY = center + labelRadius * Math.sin(labelRad);

    return {
      path,
      color: item.color || defaultColors[idx % defaultColors.length],
      label: item.label,
      value: item.value,
      percentage: percentage.toFixed(1),
      labelX,
      labelY,
    };
  });

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      {title && <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>}

      <div className="flex flex-col md:flex-row items-center justify-center gap-8">
        {/* Chart */}
        <svg width={size} height={size} className="flex-shrink-0">
          {slices.map((slice, idx) => (
            <g key={idx}>
              <path
                d={slice.path}
                fill={slice.color}
                className="hover:opacity-80 cursor-pointer transition-opacity"
              />
              {showLabels && parseFloat(slice.percentage) > 5 && (
                <text
                  x={slice.labelX}
                  y={slice.labelY}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {slice.percentage}%
                </text>
              )}
            </g>
          ))}
          {donut && (
            <text
              x={center}
              y={center}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="24"
              fontWeight="bold"
              fill="#374151"
            >
              {total}
            </text>
          )}
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="space-y-2">
            {slices.map((slice, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: slice.color }}
                ></div>
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{slice.label}</span>
                  <span className="text-gray-500 ml-2">
                    {slice.value} ({slice.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PieChart;
