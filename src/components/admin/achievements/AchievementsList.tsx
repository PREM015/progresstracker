'use client';

import { useState, useEffect } from 'react';

export function AchievementsList() {
    const [achievements, setAchievements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAchievements();
    }, []);

    const fetchAchievements = async () => {
        try {
            const res = await fetch('/api/admin/achievements');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setAchievements(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const deleteAchievement = async (id: string) => {
        if (!confirm('Delete this achievement?')) return;
        try {
            await fetch(`/api/admin/achievements/${id}`, { method: 'DELETE' });
            fetchAchievements();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

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
                            <a href={`/admin/achievements/${ach.id}`} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded">Edit</a>
                            <button onClick={() => deleteAchievement(ach.id)} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded">Delete</button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default AchievementsList;
