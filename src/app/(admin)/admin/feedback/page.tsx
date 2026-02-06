import { FeedbackList, FeedbackStats, FeedbackFilters } from '@/components/admin';

export default function FeedbackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Feedback</h1>
        <p className="text-zinc-400">User feedback and feature requests</p>
      </div>

      <FeedbackStats />
      <FeedbackList />
    </div>
  );
}
