'use client';

import React, { useState } from 'react';

interface WaitlistPageProps {
  className?: string;
}

export const WaitlistPage: React.FC<WaitlistPageProps> = ({
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center ${className}`}>
        <div className="bg-white rounded-2xl p-12 text-center max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold mb-4">You're on the list!</h2>
          <p className="text-gray-600">We'll notify you when we launch</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center ${className}`}>
      <div className="bg-white rounded-2xl p-12 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-4 text-center">Join the Waitlist</h1>
        <p className="text-gray-600 text-center mb-8">
          Be the first to know when we launch our new features
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full px-4 py-3 border-2 rounded-lg"
          />
          <button
            type="submit"
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
          >
            Join Waitlist
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Over 10,000 people already signed up!
        </p>
      </div>
    </div>
  );
};

export default WaitlistPage;
