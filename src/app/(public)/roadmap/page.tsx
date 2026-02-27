export default function RoadmapPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">🗺️ Product Roadmap</h1>
                <p className="text-gray-600 mb-8">See what we're building next</p>

                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">✓ Completed</span>
                            <h2 className="text-xl font-bold">Q1 2024</h2>
                        </div>
                        <ul className="space-y-2 text-gray-600">
                            <li>✓ Achievement system</li>
                            <li>✓ Leaderboards</li>
                            <li>✓ Platform integrations</li>
                        </ul>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">In Progress</span>
                            <h2 className="text-xl font-bold">Q2 2024</h2>
                        </div>
                        <ul className="space-y-2 text-gray-600">
                            <li>🔄 Advanced analytics</li>
                            <li>🔄 Team features</li>
                            <li>🔄 Mobile app</li>
                        </ul>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">Planned</span>
                            <h2 className="text-xl font-bold">Q3 2024</h2>
                        </div>
                        <ul className="space-y-2 text-gray-600">
                            <li>📋 AI-powered insights</li>
                            <li>📋 Collaboration tools</li>
                            <li>📋 API v2</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
