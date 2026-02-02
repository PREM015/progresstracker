/**
 * Component: ChartWidget
 * Location: components/widgets/ChartWidget.tsx
 * 
 * Description: Chart wrapper widget for displaying simple bar/line charts
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartWidgetProps {
  title?: string;
  subtitle?: string;
  data: ChartDataPoint[];
  type?: 'bar' | 'line' | 'sparkline';
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  loading?: boolean;
  className?: string;
}

// Simple Bar Chart
const BarChart: React.FC<{ data: ChartDataPoint[]; height: number; showLabels: boolean; showValues: boolean }> = ({
  data, height, showLabels, showValues
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((point, idx) => {
        const barHeight = (point.value / maxValue) * 100;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            {showValues && (
              <span className="text-xs text-[var(--text-muted)]">{point.value}</span>
            )}
            <div className="w-full flex-1 flex items-end">
              <div
                className={cn('w-full rounded-t transition-all duration-500', point.color || 'bg-[var(--primary)]')}
                style={{ height: `${barHeight}%` }}
              />
            </div>
            {showLabels && (
              <span className="text-xs text-[var(--text-muted)] truncate max-w-full">{point.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Simple Sparkline
const Sparkline: React.FC<{ data: ChartDataPoint[]; height: number }> = ({ data, height }) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = 100 - ((d.value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
      <polyline
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

// Line Chart with area fill
const LineChart: React.FC<{ data: ChartDataPoint[]; height: number; showLabels: boolean }> = ({
  data, height, showLabels
}) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = 100 - ((d.value - minValue) / range) * 100;
    return { x, y, ...d };
  });

  const linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `0,100 ${linePoints} 100,100`;

  return (
    <div className="relative" style={{ height }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon fill="url(#areaGradient)" points={areaPoints} />
        <polyline
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {showLabels && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-[var(--text-muted)] pt-1" style={{ marginTop: 4 }}>
          {data.map((d, i) => (
            <span key={i} className="truncate">{d.label}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  title,
  subtitle,
  data,
  type = 'bar',
  height = 150,
  showLabels = true,
  showValues = false,
  loading = false,
  className,
}) => {
  return (
    <Card className={cn('', className)}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>}
          {subtitle && <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>}
        </div>
      )}

      {loading ? (
        <div className="flex items-end gap-2" style={{ height }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1">
              <Skeleton variant="rectangular" height={Math.random() * 80 + 20} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {type === 'bar' && <BarChart data={data} height={height} showLabels={showLabels} showValues={showValues} />}
          {type === 'line' && <LineChart data={data} height={height} showLabels={showLabels} />}
          {type === 'sparkline' && <Sparkline data={data} height={height} />}
        </>
      )}
    </Card>
  );
};

export default ChartWidget;
