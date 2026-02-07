import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, PlayCircle, BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <Card className="col-span-4 md:col-span-2 lg:col-span-1">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button asChild className="w-full justify-start" size="lg">
          <Link href="/tracker/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            Log New Problem
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start" size="lg">
          <Link href="/goals/new">
            <PlayCircle className="mr-2 h-5 w-5" />
            Set New Goal
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start" size="lg">
          <Link href="/reports">
            <BarChart3 className="mr-2 h-5 w-5" />
            View Reports
          </Link>
        </Button>
        <Button asChild variant="ghost" className="w-full justify-start" size="lg">
          <Link href="/settings">
            <Settings className="mr-2 h-5 w-5" />
            Settings
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
