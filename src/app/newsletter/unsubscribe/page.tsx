"use client";

import { useState } from "react";

export default function NewsletterUnsubscribePage() {
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUnsubscribe = async () => {
    setUnsubscribing(true);
    try {
      await fetch('/api/newsletter/unsubscribe', { method: 'POST' });
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setUnsubscribing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-12 text-center">
          <span className="text-5xl">✓</span>
          <h1 className="text-3xl font-bold mt-6 mb-4">You've Been Unsubscribed</h1>
          <p className="text-gray-600 mb-8">
            You won't receive any more emails from us. We're sad to see you go!
          </p>
          <div className="space-y-4">
            <a
              href="/newsletter/preferences"
              className="block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Manage Preferences Instead
            </a>
            <a href="/" className="block text-gray-600 hover:underline">
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-12 text-center">
        <span className="text-5xl">😢</span>
        <h1 className="text-3xl font-bold mt-6 mb-4">Unsubscribe from Emails</h1>
        <p className="text-gray-600 mb-8">
          Are you sure you want to unsubscribe from all ProgressTracker emails?
          You can also just update your preferences to receive fewer emails.
        </p>
        <div className="space-y-4">
          <button
            onClick={handleUnsubscribe}
            disabled={unsubscribing}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {unsubscribing ? 'Unsubscribing...' : 'Unsubscribe from All'}
          </button>
          <a
            href="/newsletter/preferences"
            className="block px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Manage Preferences
          </a>
        </div>
      </div>
    </div>
  );
}
