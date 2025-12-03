// src/components/export/PreviewExport.tsx

'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { ExportData } from '@/types/export';

interface PreviewExportProps {
  data: ExportData | null;
}

export function PreviewExport({ data }: PreviewExportProps) {
  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No preview available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Tracker Entries</p>
            <p className="font-semibold">{data.trackerEntries?.length || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Goals</p>
            <p className="font-semibold">{data.goals?.length || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Achievements</p>
            <p className="font-semibold">{data.achievements?.length || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Platforms</p>
            <p className="font-semibold">{data.platforms?.length || 0}</p>
          </div>
        </div>

        {data.stats && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Statistics Summary</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Problems Solved: {data.stats.totalProblemsSolved}</div>
              <div>Current Streak: {data.stats.currentStreak} days</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}