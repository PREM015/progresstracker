'use client';

import { useAdminAchievements, Achievement } from '@/hooks/useAdminGamification';

interface AchievementsListProps {
    onEdit?: (achievement: Achievement) => void;
}

export function AchievementsList({ onEdit }: AchievementsListProps) {
    const { achievements, isLoading: loading, error, deleteAchievement } = useAdminAchievements();

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this achievement?')) return;
        try {
            await deleteAchievement(id);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error loading achievements</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((ach) => (
                <div key={ach.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="text-4xl">{ach.icon || '🏆'}</div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${ach.rarity === 'LEGENDARY' ? 'bg-yellow-500/20 text-yellow-400' :
                            ach.rarity === 'EPIC' ? 'bg-purple-500/20 text-purple-400' :
                                ach.rarity === 'RARE' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-zinc-700 text-zinc-300'
                            }`}>
                            {ach.rarity}
                        </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{ach.title}</h3>
                    <p className="text-sm text-zinc-400 mb-4">{ach.description}</p>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">{ach.points} pts</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onEdit?.(ach)}
                                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(ach.id)}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            {achievements.length === 0 && (
                <div className="col-span-full text-center text-zinc-500 py-12">
                    No achievements found. Create one to get started.
                </div>
            )}
        </div>
    );
}

export default AchievementsList;
