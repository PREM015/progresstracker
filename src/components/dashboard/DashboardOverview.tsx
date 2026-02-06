'use client';

import React, { useState, useEffect } from 'react';

interface DashboardWidget {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  color: string;
}

interface DashboardOverviewProps {
  userId: string;
  className?: string;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  userId,
  className = '',
}) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/overview')
      .then(r => r.json())
      .then(data => setWidgets(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>;
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {widgets.map(widget => (
        <div key={widget.id} className={`bg-gradient-to-br ${widget.color} text-white rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">{widget.icon}</span>
            {widget.change !== undefined && (
              <span className={`text-xs font-bold px-2 py-1 rounded ${widget.change >= 0 ? 'bg-white/20' : 'bg-black/20'
                }`}>
                {widget.change >= 0 ? '+' : ''}{widget.change}%
              </span>
            )}
          </div>
          <div className="text-3xl font-bold mb-1">{widget.value}</div>
          <div className="text-sm opacity-90">{widget.title}</div>
        </div>
      ))}
    </div>
  );
};

export default DashboardOverview;
