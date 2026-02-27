interface ActivityFeedProps {
    activities: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        createdAt: string;
    }>;
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
    const getIcon = (type: string) => {
        const icons: Record<string, string> = {
            goal_completed: '🎯',
            achievement_unlocked: '🏆',
            platform_connected: '🔗',
            streak_milestone: '🔥',
            problem_solved: '💡',
        };
        return icons[type] || '📝';
    };

    return (
        <div className="space-y-4">
            {activities.map(activity => (
                <div key={activity.id} className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="text-2xl">{getIcon(activity.type)}</div>
                    <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{activity.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-2">{new Date(activity.createdAt).toLocaleString()}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
