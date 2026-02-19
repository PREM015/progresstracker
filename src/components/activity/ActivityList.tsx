
'use client';

import React, { useEffect, useState } from 'react';
import { Activity, ActivityService } from '@/services/api/activity.service';
import { format } from 'date-fns';
import { Edit2, Trash2, Clock, Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ActivityListProps {
    onEdit: (activity: Activity) => void;
    refreshTrigger?: number;
}

export const ActivityList: React.FC<ActivityListProps> = ({ onEdit, refreshTrigger = 0 }) => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchActivities = async () => {
        setIsLoading(true);
        try {
            const response = await ActivityService.getActivities({ limit: 50 });
            console.log('Fetched activities:', response);
            // The service returns the data array directly due to httpClient unwrapping
            setActivities(Array.isArray(response) ? response : (response as any).data || []);
            setError(null);
        } catch (err) {
            console.error('Fetch activities error:', err);
            setError('Failed to load activities');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, [refreshTrigger]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this activity?')) return;
        try {
            await ActivityService.deleteActivity(id);
            setActivities(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            alert('Failed to delete activity');
        }
    };

    if (isLoading && activities.length === 0) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 text-center p-4">{error}</div>;
    }

    if (activities.length === 0) {
        return (
            <div className="text-center p-8 text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No activities logged yet.</p>
                <p className="text-sm mt-1 opacity-70">Start logging your daily progress!</p>
            </div>
        );
    }

    // Group by date
    const grouped = activities.reduce((acc, activity) => {
        const dateStr = new Date(activity.date).toDateString();
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(activity);
        return acc;
    }, {} as Record<string, Activity[]>);

    return (
        <div className="space-y-8">
            {Object.entries(grouped).map(([dateStr, items]) => (
                <div key={dateStr} className="space-y-4">
                    <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider sticky top-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm py-2 z-10 w-full border-b border-zinc-100 dark:border-zinc-800/50">
                        {format(new Date(dateStr), "EEEE, MMMM do")}
                    </h4>
                    <div className="grid gap-3">
                        {items.map((activity) => (
                            <div
                                key={activity.id}
                                className="group flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-emerald-500/30 hover:shadow-sm transition-all"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                            {activity.category}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                                            <Clock className="w-3 h-3" />
                                            {activity.timeSpent} min
                                        </span>
                                    </div>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                        {activity.notes || 'No description'}
                                    </p>

                                    {/* Metrics & Tags */}
                                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-500">
                                        {activity.problemsSolved > 0 && <span>Problems: {activity.problemsSolved}</span>}
                                        {activity.linesOfCode > 0 && <span>LOC: {activity.linesOfCode}</span>}
                                        {activity.articlesRead > 0 && <span>Read: {activity.articlesRead}</span>}
                                        {activity.tags && activity.tags.length > 0 && (
                                            <div className="flex items-center gap-1 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                                                <Tag className="w-3 h-3" />
                                                {activity.tags.map(t => `#${t}`).join(' ')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-start sm:self-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-zinc-400 hover:text-indigo-600"
                                        onClick={() => onEdit(activity)}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-zinc-400 hover:text-red-600"
                                        onClick={() => handleDelete(activity.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
