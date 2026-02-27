'use client';

export function AchievementPreview({ achievement }: any) {
    if (!achievement) return null;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
            <div className="text-center">
                <div className="text-6xl mb-4">{achievement.icon || '🏆'}</div>
                <h2 className="text-2xl font-bold text-white mb-2">{achievement.title}</h2>
                <p className="text-zinc-400 mb-4">{achievement.description}</p>
                <div className="flex items-center justify-center gap-4">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${achievement.rarity === 'LEGENDARY' ? 'bg-yellow-500/20 text-yellow-400' :
                            achievement.rarity === 'EPIC' ? 'bg-purple-500/20 text-purple-400' :
                                achievement.rarity === 'RARE' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-zinc-700 text-zinc-300'
                        }`}>
                        {achievement.rarity}
                    </span>
                    <span className="text-indigo-400 font-semibold">{achievement.points} points</span>
                </div>
            </div>
        </div>
    );
}

export default AchievementPreview;
