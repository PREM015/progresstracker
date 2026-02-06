"use client";

import { useState } from "react";

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Failed to join waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="text-6xl mb-6">🚀</div>
        <h1 className="text-5xl font-bold mb-4">Join the Waitlist</h1>
        <p className="text-xl text-gray-600 mb-8">
          Be the first to know when we launch new features and exclusive access
        </p>

        {submitted ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're on the list!</h2>
            <p className="text-gray-600">
              We'll notify you at <span className="font-medium">{email}</span> when we have updates
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-8">
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 text-lg border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-indigo-600 text-white text-lg font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Waitlist'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </form>
        )}

        <div className="mt-12 grid md:grid-cols-3 gap-8">
          <div>
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-bold mb-1">Early Access</h3>
            <p className="text-sm text-gray-600">Get exclusive early access to new features</p>
          </div>
          <div>
            <div className="text-3xl mb-2">💰</div>
            <h3 className="font-bold mb-1">Special Pricing</h3>
            <p className="text-sm text-gray-600">Discounted rates for early supporters</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🎁</div>
            <h3 className="font-bold mb-1">Exclusive Content</h3>
            <p className="text-sm text-gray-600">Access to beta features and updates</p>
          </div>
        </div>
      </div>
    </div>
  );
}
