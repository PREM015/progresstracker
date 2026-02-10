'use client';

import { useState } from 'react';
import { AchievementsList, AchievementStats, AchievementForm } from '@/components/admin';
import { Modal } from '@/components/common/Modal';
import { useAdminAchievements, Achievement } from '@/hooks/useAdminGamification';

export default function AchievementsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const { createAchievement, updateAchievement, isCreating, isUpdating } = useAdminAchievements();

  const handleCreate = () => {
    setSelectedAchievement(null);
    setIsModalOpen(true);
  };

  const handleEdit = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedAchievement) {
        await updateAchievement({ id: selectedAchievement.id, data });
      } else {
        await createAchievement(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save achievement:', error);
      // Error handling could be more robust here
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Achievements</h1>
          <p className="text-zinc-400">Manage user achievements and rewards</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Create Achievement
        </button>
      </div>

      <AchievementStats />
      <AchievementsList onEdit={handleEdit} />

      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={selectedAchievement ? 'Edit Achievement' : 'Create Achievement'}
      >
        <AchievementForm
          achievement={selectedAchievement}
          onSubmit={handleSave}
          onCancel={() => setIsModalOpen(false)}
          isSubmitting={isCreating || isUpdating}
        />
      </Modal>
    </div>
  );
}