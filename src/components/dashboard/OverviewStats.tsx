import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Flame, Trophy, Target } from 'lucide-react';

interface StatsProps {
    totalSolved: number;
    streak: number;
    monthlyGoalProgress: number;
    totalPoints: number;
}

export function OverviewStats({ totalSolved = 0, streak = 0, monthlyGoalProgress = 0, totalPoints = 0 }: Partial<StatsProps>) {
    return (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 w-full">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Solved</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalSolved}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                    <Flame className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{streak} Days</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Goal</CardTitle>
                    <Target className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{monthlyGoalProgress}%</div>
                    <div className="h-2 w-full bg-secondary mt-1 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${monthlyGoalProgress}%` }} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                    <Trophy className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalPoints}</div>
                </CardContent>
            </Card>
        </div>
    );
}
