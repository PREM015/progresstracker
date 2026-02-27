'use client';

import React from 'react';

interface LegendItem {
  label: string;
  color: string;
  value?: string | number;
}

interface ChartLegendProps {
  items: LegendItem[];
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  layout?: 'horizontal' | 'vertical';
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  items,
  className = '',
  position = 'bottom',
  layout = 'horizontal',
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  const positionClasses = {
    top: 'mb-4',
    bottom: 'mt-4',
    left: 'mr-4',
    right: 'ml-4',
  };

  const layoutClasses = {
    horizontal: 'flex flex-wrap items-center gap-4',
    vertical: 'flex flex-col gap-2',
  };

  return (
    <div className={`${positionClasses[position]} ${className}`}>
      <div className={layoutClasses[layout]}>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 group cursor-pointer">
            <div
              className="w-4 h-4 rounded transition-transform group-hover:scale-110"
              style={{ backgroundColor: item.color }}
            ></div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
              {item.label}
            </span>
            {item.value !== undefined && (
              <span className="text-sm text-gray-500">({item.value})</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartLegend;
