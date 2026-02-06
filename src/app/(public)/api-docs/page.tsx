export default function ApiDocsPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">📚 API Documentation</h1>
                <p className="text-gray-600 mb-8">Complete API reference for developers</p>

                <div className="bg-white border border-gray-200 rounded-xl p-8">
                    <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
                    <p className="text-gray-600 mb-6">Authentication is required for all API endpoints. Include your API key in the Authorization header.</p>

                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-8 font-mono text-sm">
                        curl -H "Authorization: Bearer YOUR_API_KEY" https://api.progresstracker.com/v1/...
                    </div>

                    <h3 className="text-xl font-bold mb-4">Endpoints</h3>
                    <div className="space-y-4">
                        {[
                            { method: 'GET', path: '/api/achievements', desc: 'List all achievements' },
                            { method: 'GET', path: '/api/goals', desc: 'List all goals' },
                            { method: 'POST', path: '/api/tracker', desc: 'Create tracker entry' },
                            { method: 'GET', path: '/api/leaderboard', desc: 'Get leaderboard data' }
                        ].map(endpoint => (
                            <div key={endpoint.path} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">{endpoint.method}</span>
                                    <code className="text-sm font-mono">{endpoint.path}</code>
                                </div>
                                <p className="text-sm text-gray-600">{endpoint.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
