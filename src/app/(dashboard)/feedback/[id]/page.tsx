"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function FeedbackDetailPage() {
  const params = useParams();
  const feedbackId = params.id as string;

  const [feedback, setFeedback] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/feedback/${feedbackId}`).then(r => r.json()),
      fetch(`/api/feedback/${feedbackId}/comments`).then(r => r.json())
    ])
      .then(([feedbackData, commentsData]) => {
        setFeedback(feedbackData.feedback);
        setComments(commentsData.comments || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [feedbackId]);

  const addComment = async () => {
    if (!newComment.trim()) return;

    setAdding(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();
      setComments([...comments, data.comment]);
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">💬</span>
          <p className="mt-4 text-gray-500">Feedback not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{feedback.title}</h1>
              <div className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-1 rounded ${feedback.type === 'FEATURE' ? 'bg-blue-100 text-blue-700' :
                    feedback.type === 'BUG' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                  }`}>
                  {feedback.type}
                </span>
                <span className={`px-2 py-1 rounded ${feedback.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                    feedback.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                  }`}>
                  {feedback.status}
                </span>
                <span className="text-gray-500">
                  {new Date(feedback.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded text-sm ${feedback.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                feedback.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
              }`}>
              {feedback.priority} Priority
            </span>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{feedback.description}</p>
          </div>

          {feedback.upvotes !== undefined && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-600">👍 {feedback.upvotes} upvotes</span>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Comments ({comments.length})</h2>

          <div className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              placeholder="Add a comment..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
            />
            <button
              onClick={addComment}
              disabled={adding || !newComment.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Comment'}
            </button>
          </div>

          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No comments yet</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">{comment.user?.name || 'User'}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
