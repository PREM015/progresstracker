import { AchievementsList, AchievementStats } from '@/components/admin';

export default function AchievementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Achievements</h1>
        <p className="text-zinc-400">Manage user achievements and rewards</p>
      </div>

      <AchievementStats />
      <AchievementsList />
    </div>
  );
}