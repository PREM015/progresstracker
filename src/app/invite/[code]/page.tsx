"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${code}`)
      .then(r => r.json())
      .then(data => setInvite(data.invite))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [code]);

  const acceptInvite = async () => {
    setAccepting(true);
    try {
      await fetch(`/api/invites/${code}/accept`, { method: 'POST' });
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!invite || invite.expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-12 text-center">
          <span className="text-5xl">❌</span>
          <h1 className="text-3xl font-bold mt-6 mb-4">Invalid Invite</h1>
          <p className="text-gray-600 mb-8">
            {invite?.expired ? 'This invitation has expired.' : 'This invitation link is invalid.'}
          </p>
          <a href="/register" className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-block">
            Sign Up
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-12 text-center">
        <span className="text-5xl">🎉</span>
        <h1 className="text-3xl font-bold mt-6 mb-4">You're Invited!</h1>
        <p className="text-gray-600 mb-2">
          <strong>{invite.inviterName}</strong> has invited you to join
        </p>
        <p className="text-2xl font-bold text-indigo-600 mb-8">
          {invite.teamName || 'ProgressTracker'}
        </p>

        <button
          onClick={acceptInvite}
          disabled={accepting}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 mb-4"
        >
          {accepting ? 'Accepting...' : 'Accept Invitation'}
        </button>
        <a href="/" className="text-gray-600 hover:underline">
          Decline
        </a>
      </div>
    </div>
  );
}
