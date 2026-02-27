'use client';

import { useAdminFeedback } from '@/hooks/useAdminFeedback';

export function FeedbackList() {
    const { feedback, isLoading: loading, error } = useAdminFeedback();

    if (loading) {
        return <div className="text-center text-zinc-500">Loading feedback...</div>;
    }

    if (error) {
        return <div className="text-center text-red-500">Error loading feedback</div>;
    }

    if (feedback.length === 0) {
        return <div className="text-center text-zinc-500">No feedback found</div>;
    }

    return (
        <div className="space-y-4">
            {feedback.map(f => (
                <div key={f.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className="text-white font-semibold">{f.user?.email || 'Anonymous'}</div>
                            <div className="text-zinc-500 text-sm">{new Date(f.createdAt).toLocaleString()}</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${f.type === 'BUG' ? 'bg-red-500/20 text-red-400' : f.type === 'FEATURE' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700 text-zinc-300'}`}>
                            {f.type}
                        </span>
                    </div>
                    <p className="text-zinc-400">{f.message}</p>
                </div>
            ))}
        </div>
    );
}

export default FeedbackList;
