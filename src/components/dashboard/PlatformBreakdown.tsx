'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { BarChart3 } from 'lucide-react';

interface PlatformStat {
    platform: string;
    count: number;
    color?: string;
}

interface PlatformBreakdownProps {
    data?: PlatformStat[];
}

const defaultColors = ['#fca5a5', '#86efac', '#93c5fd', '#c4b5fd', '#cbd5e1'];

export function PlatformBreakdown({ data = [] }: PlatformBreakdownProps) {
    const max = Math.max(...data.map(d => d.count), 1); // Prevent division by zero

    return (
        <Card className="col-span-4 md:col-span-2 lg:col-span-1 w-full">
            <CardHeader>
                <CardTitle>Platform Breakdown</CardTitle>
                <CardDescription>Where you solve the most</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <EmptyState
                        title="No data yet"
                        description="Solve problems to see breakdown"
                        variant="small"
                        icon={BarChart3}
                    />
                ) : (
                    <div className="space-y-4">
                        {data.map((item, index) => (
                            <div key={item.platform} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{item.platform}</span>
                                    <span className="text-muted-foreground">{item.count}</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500 ease-out"
                                        style={{
                                            width: `${(item.count / max) * 100}%`,
                                            backgroundColor: item.color || defaultColors[index % defaultColors.length]
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
