'use client';

import React, { useState } from 'react';

interface NewsletterProps {
  className?: string;
}

export const Newsletter: React.FC<NewsletterProps> = ({
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setSubscribed(true);
  };

  if (subscribed) {
    return (
      <section className={`py-20 bg-green-50 ${className}`}>
        <div className="container mx-auto px-6 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-green-900">Thank You!</h3>
          <p className="text-green-700">You're subscribed to our newsletter</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-20 bg-indigo-50 ${className}`}>
      <div className="container mx-auto px-6 max-w-2xl text-center">
        <h2 className="text-4xl font-bold mb-4">Stay Updated</h2>
        <p className="text-gray-600 mb-8">Get the latest tips and updates delivered to your inbox</p>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="flex-1 px-6 py-4 rounded-lg border-2"
          />
          <button
            type="submit"
            className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
};

export default Newsletter;
