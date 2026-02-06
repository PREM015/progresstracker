'use client';

import React from 'react';

interface SupportPageProps {
  className?: string;
}

export const SupportPage: React.FC<SupportPageProps> = ({
  className = '',
}) => {
  const categories = [
    { icon: '📚', title: 'Documentation', desc: 'Browse our guides' },
    { icon: '💬', title: 'Community', desc: 'Ask the community' },
    { icon: '🎫', title: 'Tickets', desc: 'Contact support' },
    { icon: '📧', title: 'Email Us', desc: 'support@example.com' },
  ];

  return (
    <div className={`bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-12 ${className}`}>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">How can we help?</h1>
        <p className="text-lg text-gray-600">Get answers to your questions</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {categories.map((cat, idx) => (
          <button
            key={idx}
            className="bg-white border-2 border-transparent hover:border-indigo-500 rounded-xl p-6 text-center transition-all"
          >
            <div className="text-5xl mb-3">{cat.icon}</div>
            <div className="font-bold text-gray-900 mb-1">{cat.title}</div>
            <div className="text-sm text-gray-600">{cat.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SupportPage;
