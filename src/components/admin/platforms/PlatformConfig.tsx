'use client';

import { useState, useEffect } from 'react';

export function PlatformConfig({ platformId }: { platformId: string }) {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, [platformId]);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`/api/admin/platforms/${platformId}/config`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setConfig(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/platforms/${platformId}/config`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (!res.ok) throw new Error('Failed to save');
            alert('Configuration saved!');
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading configuration...</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Platform Configuration</h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">API Key</label>
                    <input
                        type="text"
                        value={config?.apiKey || ''}
                        onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">API Secret</label>
                    <input
                        type="password"
                        value={config?.apiSecret || ''}
                        onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Webhook URL</label>
                    <input
                        type="url"
                        value={config?.webhookUrl || ''}
                        onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="syncEnabled"
                        checked={config?.syncEnabled || false}
                        onChange={(e) => setConfig({ ...config, syncEnabled: e.target.checked })}
                        className="w-4 h-4"
                    />
                    <label htmlFor="syncEnabled" className="text-sm text-white">Enable Auto-Sync</label>
                </div>

                <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
}

export default PlatformConfig;
