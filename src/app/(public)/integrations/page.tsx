export default function PublicIntegrationsPage() {
    const integrations = [
        { name: 'GitHub', icon: '🐙', desc: 'Track your commits and PRs' },
        { name: 'GitLab', icon: '🦊', desc: 'Monitor your GitLab activity' },
        { name: 'LeetCode', icon: '💡', desc: 'Sync your problem solving' },
        { name: 'Codeforces', icon: '🏆', desc: 'Import competitive programming stats' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">🔌 Integrations</h1>
                <p className="text-gray-600 mb-8">Connect your favorite platforms</p>

                <div className="grid md:grid-cols-2 gap-6">
                    {integrations.map(integration => (
                        <div key={integration.name} className="bg-white border border-gray-200 rounded-xl p-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="text-5xl">{integration.icon}</div>
                                <div>
                                    <h3 className="text-xl font-bold">{integration.name}</h3>
                                    <p className="text-gray-600 text-sm">{integration.desc}</p>
                                </div>
                            </div>
                            <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                Connect
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
