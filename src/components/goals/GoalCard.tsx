// src/components/goals/GoalCard.tsx

'use client';

import React, { useState } from 'react';
import { 
  Target, 
  Calendar, 
  MoreVertical, 
  Edit, 
  Trash2, 
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/Dropdown';
import { GoalWithProgress } from '@/types/goal';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: GoalWithProgress;
  onEdit?: (goal: GoalWithProgress) => void;
  onDelete?: (goalId: string) => void;
  onComplete?: (goalId: string) => void;
  onUpdateProgress?: (goalId: string, progress: number) => void;
}

export function GoalCard({
  goal,
  onEdit,
  onDelete,
  onComplete,
  onUpdateProgress,
}: GoalCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { progressInfo } = goal;

  const handleIncrement = async () => {
    if (onUpdateProgress && !progressInfo.isComplete) {
      setIsUpdating(true);
      try {
        await onUpdateProgress(goal.id, progressInfo.current + 1);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const getStatusColor = () => {
    if (progressInfo.isComplete) return 'bg-green-500';
    if (progressInfo.percentage >= 75) return 'bg-blue-500';
    if (progressInfo.percentage >= 50) return 'bg-yellow-500';
    if (progressInfo.percentage >= 25) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  const getStatusBadge = () => {
    if (progressInfo.isComplete) {
      return <Badge variant="success">Completed</Badge>;
    }
    if (progressInfo.daysLeft !== undefined) {
      if (progressInfo.daysLeft === 0) {
        return <Badge variant="destructive">Due Today</Badge>;
      }
      if (progressInfo.daysLeft < 3) {
        return <Badge variant="warning">{progressInfo.daysLeft} days left</Badge>;
      }
    }
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      progressInfo.isComplete && 'opacity-75'
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              getStatusColor(),
              'text-white'
            )}>
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{goal.title}</h3>
              {goal.description && (
                <p className="text-xs text-muted-foreground">{goal.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(goal)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onComplete && !progressInfo.isComplete && (
                  <DropdownMenuItem onClick={() => onComplete(goal.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(goal.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {progressInfo.current} / {progressInfo.target}
              {goal.unit && ` ${goal.unit}`}
            </span>
          </div>
          <Progress value={progressInfo.percentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progressInfo.percentage}% complete</span>
            <span>{progressInfo.remaining} remaining</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {goal.deadline && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(goal.deadline), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                Created {formatDistanceToNow(new Date(goal.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          {!progressInfo.isComplete && onUpdateProgress && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleIncrement}
              disabled={isUpdating}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              +1
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default GoalCard;