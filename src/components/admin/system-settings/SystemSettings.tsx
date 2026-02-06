'use client';

import { useState, useEffect } from 'react';

interface SystemSetting {
    id: string;
    key: string;
    value: string;
    description: string | null;
    type: string;
    isPublic: boolean;
    updatedAt: string;
}

export function SystemSettings() {
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/system-settings');
            if (!res.ok) throw new Error('Failed to fetch settings');
            const data = await res.json();
            setSettings(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (setting: SystemSetting) => {
        setEditingId(setting.id);
        setEditValue(setting.value);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    const saveSetting = async (key: string) => {
        try {
            const res = await fetch(`/api/admin/system-settings/${key}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: editValue }),
            });
            if (!res.ok) throw new Error('Failed to update setting');
            fetchSettings();
            setEditingId(null);
            setEditValue('');
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
                <div className="text-center text-zinc-500">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {settings.map((setting) => (
                <div key={setting.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-white">{setting.key}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${setting.isPublic ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'
                                    }`}>
                                    {setting.isPublic ? 'Public' : 'Private'}
                                </span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                                    {setting.type}
                                </span>
                            </div>

                            {setting.description && (
                                <p className="text-sm text-zinc-400 mb-4">{setting.description}</p>
                            )}

                            {editingId === setting.id ? (
                                <div className="flex items-center gap-2">
                                    {setting.type === 'BOOLEAN' ? (
                                        <select
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="true">True</option>
                                            <option value="false">False</option>
                                        </select>
                                    ) : setting.type === 'NUMBER' ? (
                                        <input
                                            type="number"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    )}
                                    <button
                                        onClick={() => saveSetting(setting.key)}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <span className="text-white font-mono">{setting.value}</span>
                                        <div className="text-xs text-zinc-600 mt-1">
                                            Updated {new Date(setting.updatedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => startEdit(setting)}
                                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                    >
                                        Edit
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {settings.length === 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
                    No system settings found
                </div>
            )}
        </div>
    );
}

export default SystemSettings;
