'use client';

import React, { useState, useEffect } from 'react';

interface WidgetData {
    id: string;
    type: 'stat' | 'chart' | 'list';
    title: string;
    value?: any;
}

interface DashboardWidgetProps {
    widgetId: string;
    refreshInterval?: number;
    className?: string;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
    widgetId,
    refreshInterval,
    className = '',
}) => {
    const [data, setData] = useState<WidgetData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();

        if (refreshInterval) {
            const interval = setInterval(fetchData, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [widgetId, refreshInterval]);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/widgets/${widgetId}`);
            const widgetData = await res.json();
            setData(widgetData);
        } catch (err) {
            console.error('Widget fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className={`h-48 bg-gray-100 rounded-xl animate-pulse ${className}`} />;
    }

    if (!data) return null;

    return (
        <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">{data.title}</h3>
                <button
                    onClick={fetchData}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Refresh"
                >
                    🔄
                </button>
            </div>

            <div className="text-3xl font-bold text-gray-900">
                {JSON.stringify(data.value)}
            </div>
        </div>
    );
};

export default DashboardWidget;
