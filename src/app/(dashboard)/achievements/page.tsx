'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { AchievementsList } from '@/components/achievements/AchievementsList';
import { AchievementModal } from '@/components/achievements/AchievementDetails';
import { Achievement } from '@/types/achievement';
import { RefreshCw, Grid, List as ListIcon } from 'lucide-react';
import { MetaTags } from '@/components/seo/MetaTags';
import { Button } from '@/components/ui/button';

export default function AchievementsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <MetaTags title="Achievements" description="Track your progress and unlock rewards." />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
              <p className="text-sm text-gray-500 mt-1">
                Track your progress and unlock rewards
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setLayout('grid')}
                  className={`p-2 rounded-md transition-colors ${layout === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setLayout('list')}
                  className={`p-2 rounded-md transition-colors ${layout === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  <ListIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <AchievementsList
          userId={userId}
          layout={layout}
          onAchievementClick={setSelectedAchievement}
        />
      </main>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          isOpen={true}
          onClose={() => setSelectedAchievement(null)}
          onPin={async (id: string) => { console.log('Pin toggled', id); }}
          onShare={(achievement: any) => { console.log('Shared', achievement.id); }}
        />
      )}
    </div>
  );
}