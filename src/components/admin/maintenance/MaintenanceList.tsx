'use client';

import { useState, useEffect } from 'react';

interface MaintenanceWindow {
    id: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
    isActive: boolean;
    createdAt: string;
}

export function MaintenanceList() {
    const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
    });

    useEffect(() => {
        fetchWindows();
    }, []);

    const fetchWindows = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/maintenance');
            if (!res.ok) throw new Error('Failed to fetch maintenance windows');
            const data = await res.json();
            setWindows(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createWindow = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/admin/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error('Failed to create maintenance window');

            setFormData({ title: '', description: '', startTime: '', endTime: '' });
            setShowForm(false);
            fetchWindows();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const deleteWindow = async (id: string) => {
        if (!confirm('Delete this maintenance window?')) return;

        try {
            const res = await fetch(`/api/admin/maintenance/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete window');
            fetchWindows();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const toggleWindow = async (id: string, isActive: boolean) => {
        try {
            const endpoint = isActive ? 'deactivate' : 'activate';
            const res = await fetch(`/api/admin/maintenance/${id}/${endpoint}`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to toggle window');
            fetchWindows();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Maintenance Windows</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                    {showForm ? 'Cancel' : 'Schedule Maintenance'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={createWindow} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Start Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">End Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                        >
                            Create Maintenance Window
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
                    Loading...
                </div>
            ) : windows.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
                    No maintenance windows scheduled
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {windows.map((window) => (
                        <div key={window.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-white">{window.title}</h3>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${window.isActive ? 'bg-red-500/20 text-red-400' : 'bg-zinc-700 text-zinc-300'
                                            }`}>
                                            {window.isActive ? 'ACTIVE' : 'Scheduled'}
                                        </span>
                                    </div>

                                    {window.description && (
                                        <p className="text-sm text-zinc-400 mb-4">{window.description}</p>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-zinc-500">Start Time</span>
                                            <div className="text-white mt-1">
                                                {new Date(window.startTime).toLocaleString()}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500">End Time</span>
                                            <div className="text-white mt-1">
                                                {new Date(window.endTime).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        onClick={() => toggleWindow(window.id, window.isActive)}
                                        className={`px-4 py-2 rounded-lg transition-colors ${window.isActive
                                                ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                                                : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                                            }`}
                                    >
                                        {window.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => deleteWindow(window.id)}
                                        className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MaintenanceList;
