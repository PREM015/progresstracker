import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Code, FileText, Trophy, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '@/components/common/EmptyState';

export interface ActivityItem {
    id: string;
    type: 'solve' | 'achievement' | 'goal' | 'post';
    title: string;
    description: string;
    timestamp: Date;
    platform?: string;
    points?: number;
}

interface RecentActivityListProps {
    activities?: ActivityItem[];
}

const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
        case 'solve':
            return <Code className="h-4 w-4 text-blue-500" />;
        case 'achievement':
            return <Trophy className="h-4 w-4 text-yellow-500" />;
        case 'goal':
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'post':
            return <FileText className="h-4 w-4 text-purple-500" />;
        default:
            return <Activity className="h-4 w-4 text-gray-500" />;
    }
};

export function RecentActivityList({ activities = [] }: RecentActivityListProps) {
    return (
        <Card className="col-span-4 lg:col-span-2 w-full">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                    Your latest actions and achievements.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {activities.length === 0 ? (
                    <EmptyState
                        title="No recent activity"
                        description="Start solving problems to see them here!"
                        variant="small"
                        icon={Activity}
                    />
                ) : (
                    <ScrollArea className="h-[350px] pr-4">
                        <div className="space-y-4">
                            {activities.map((item) => (
                                <div key={item.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                                    <div className="mt-1 bg-muted p-2 rounded-full">
                                        {getIcon(item.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">{item.title}</p>
                                        <p className="text-sm text-muted-foreground">{item.description}</p>
                                        <div className="flex items-center gap-2 pt-1">
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                            </span>
                                            {item.platform && (
                                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                                    {item.platform}
                                                </span>
                                            )}
                                            {item.points && (
                                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                                                    +{item.points} pts
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
