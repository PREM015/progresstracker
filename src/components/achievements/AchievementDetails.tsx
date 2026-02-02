/**
 * Component: AchievementDetails
 * Location: components/achievements/AchievementDetails.tsx
 * 
 * Description: High-end immersive achievement details view with full stats and requirements
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Target,
  Calendar,
  Users,
  CheckCircle2,
  Lock,
  Pin,
  Share2,
  ArrowRight,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AchievementBadge } from './AchievementBadge';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Achievement,
  UserAchievement,
  AchievementProgress,
  RARITY_CONFIG,
  TIER_CONFIG,
  CATEGORY_CONFIG
} from '@/types/achievement';
import { TimeAgo } from '@/components/widgets/TimeAgo';

export interface AchievementDetailsProps {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  progress?: AchievementProgress;
  unlockRate?: number; // percentage of users who unlocked this
  onPin?: (id: string) => void;
  onShare?: (id: string) => void;
  className?: string;
}

export const AchievementDetails: React.FC<AchievementDetailsProps> = ({
  achievement,
  userAchievement,
  progress,
  unlockRate = 0,
  onPin,
  onShare,
  className,
}) => {
  const isUnlocked = !!userAchievement;
  const isPinned = userAchievement?.isPinned ?? false;
  const percentage = progress?.percentage || (isUnlocked ? 100 : 0);

  const rarityConfig = RARITY_CONFIG[achievement.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common;
  const tierConfig = TIER_CONFIG[achievement.tier] || TIER_CONFIG.bronze;
  const categoryConfig = CATEGORY_CONFIG[achievement.category as keyof typeof CATEGORY_CONFIG];

  return (
    <div className={cn('w-full max-w-2xl mx-auto space-y-8 p-1', className)}>
      {/* Header Section */}
      <section className="text-center space-y-6">
        <div className="relative inline-block">
          <div
            className="absolute inset-0 blur-3xl rounded-full opacity-30 transform scale-150 animate-pulse"
            style={{ backgroundColor: rarityConfig.color }}
          />
          <AchievementBadge
            achievement={achievement}
            isUnlocked={isUnlocked}
            size="xl"
            showTooltip={false}
          />
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-black tracking-tight text-[var(--foreground)]">
              {achievement.title}
            </h1>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Badge
                variant="default"
                className="bg-white/10 backdrop-blur-md border-white/20 text-white font-bold tracking-widest px-4 py-1"
                style={{ backgroundColor: `${rarityConfig.color}40`, color: '#fff' }}
              >
                {rarityConfig.label.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="border-[var(--card-border)] bg-transparent text-[var(--text-muted)] font-bold tracking-widest px-4 py-1">
                {categoryConfig?.label.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="border-[var(--card-border)] bg-transparent text-[var(--text-muted)] font-bold tracking-widest px-4 py-1">
                {tierConfig.label.toUpperCase()}
              </Badge>
            </div>
          </div>

          <p className="text-lg text-[var(--text-muted)] font-medium max-w-lg mx-auto leading-relaxed">
            {achievement.description}
          </p>
        </div>
      </section>

      {/* Stats Dashboard */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Rarity', value: `${unlockRate}%`, icon: <Users className="w-5 h-5 text-blue-500" /> },
          { label: 'Points', value: achievement.points, icon: <Trophy className="w-5 h-5 text-amber-500" /> },
          { label: 'Experience', value: `${achievement.xpReward} XP`, icon: <Flame className="w-5 h-5 text-orange-500" /> },
          { label: 'Status', value: isUnlocked ? 'Unlocked' : 'Locked', icon: isUnlocked ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Lock className="w-5 h-5 text-zinc-500" /> },
        ].map((stat, i) => (
          <Card key={i} className="flex flex-col items-center text-center p-4 border-[var(--card-border)]/50 backdrop-blur-xl bg-white/5">
            <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 mb-2">
              {stat.icon}
            </div>
            <p className="text-sm font-bold text-[var(--foreground)]">{stat.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">{stat.label}</p>
          </Card>
        ))}
      </section>

      {/* Progress & Requirements */}
      <section className="space-y-6 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Target className="w-32 h-32" />
        </div>

        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-black">Requirements</h3>
              <p className="text-sm text-[var(--text-muted)] font-medium">What you need to do</p>
            </div>
            {!isUnlocked && (
              <div className="text-right">
                <span className="text-3xl font-black text-[var(--primary)]">{Math.round(percentage)}%</span>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Complete</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)]/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-[var(--primary)] text-white">
                  <Target className="w-4 h-4" />
                </div>
                <p className="text-sm font-bold">{achievement.requirement.metric.replace(/_/g, ' ').toUpperCase()}</p>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] ml-auto" />
                <p className="text-sm font-black whitespace-nowrap">{progress?.current || 0} / {achievement.requirement.value}</p>
              </div>
              <Progress value={percentage} size="md" className="h-2 rounded-full" />
            </div>

            {isUnlocked && userAchievement?.unlockedAt && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <Calendar className="w-5 h-5 text-emerald-500" />
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Successfully Unlocked</p>
                  <p className="text-xs font-medium opacity-70"><TimeAgo date={userAchievement.unlockedAt} /></p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="flex flex-col sm:flex-row gap-4">
        {onPin && isUnlocked && (
          <Button
            variant={isPinned ? 'primary' : 'outline'}
            size="lg"
            className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest"
            onClick={() => onPin(achievement.id)}
            leftIcon={<Pin className="w-5 h-5" fill={isPinned ? "currentColor" : "none"} />}
          >
            {isPinned ? 'Pinned to Profile' : 'Pin Achievement'}
          </Button>
        )}
        {onShare && (
          <Button
            variant="outline"
            size="lg"
            className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest border-[var(--card-border)]"
            onClick={() => onShare(achievement.id)}
            leftIcon={<Share2 className="w-5 h-5" />}
          >
            Share Trophy
          </Button>
        )}
      </section>
    </div>
  );
};

export default AchievementDetails;
