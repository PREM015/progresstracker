// src/components/goals/GoalAchievements.tsx

'use client';

import React from 'react';
import { Trophy, Lock, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { AchievementProgress, rarityColors } from '@/types/achievement';
import { cn } from '@/lib/utils';

interface GoalAchievementsProps {
  achievements: AchievementProgress[];
  showLocked?: boolean;
  maxDisplay?: number;
  className?: string;
}

export function GoalAchievements({
  achievements,
  showLocked = true,
  maxDisplay = 8,
  className,
}: GoalAchievementsProps) {
  const unlocked = achievements.filter(a => a.isUnlocked);
  const locked = achievements.filter(a => !a.isUnlocked);
  
  const displayAchievements = showLocked
    ? [...unlocked, ...locked.slice(0, maxDisplay - unlocked.length)]
    : unlocked.slice(0, maxDisplay);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements
          </CardTitle>
          <Badge variant="outline">
            {unlocked.length}/{achievements.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {displayAchievements.map((ap) => (
            <Tooltip key={ap.achievementId}>
              <TooltipTrigger>
                <div
                  className={cn(
                    'relative flex flex-col items-center p-2 rounded-lg transition-all',
                    ap.isUnlocked
                      ? rarityColors[ap.achievement.rarity].bg
                      : 'bg-muted/50 opacity-50'
                  )}
                >
                  <span className="text-2xl mb-1">
                    {ap.isUnlocked ? ap.achievement.icon : '🔒'}
                  </span>
                  <span className="text-xs text-center font-medium truncate w-full">
                    {ap.achievement.name}
                  </span>
                  {!ap.isUnlocked && ap.percentage > 0 && (
                    <Progress 
                      value={ap.percentage} 
                      className="h-1 mt-1 w-full" 
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-semibold">{ap.achievement.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ap.achievement.description}
                  </p>
                  {!ap.isUnlocked && (
                    <p className="text-xs mt-1">
                      Progress: {ap.current}/{ap.target} ({ap.percentage}%)
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs">{ap.achievement.points} points</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {achievements.length > maxDisplay && (
          <p className="text-xs text-center text-muted-foreground mt-3">
            +{achievements.length - maxDisplay} more achievements
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default GoalAchievements;