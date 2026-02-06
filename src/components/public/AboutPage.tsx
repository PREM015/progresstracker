'use client';

import React from 'react';

interface AboutPageProps {
  className?: string;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl p-12 ${className}`}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About Progress Tracker</h1>

        <div className="prose prose-lg">
          <p className="text-lg text-gray-700 mb-6">
            Progress Tracker helps you monitor your growth across all your learning platforms
            in one beautiful, unified dashboard.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-700 mb-6">
            We believe that tracking progress is essential to achieving your goals. Our platform
            makes it easy to visualize your journey and stay motivated.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Features</h2>
          <ul className="space-y-3 mb-6">
            {['Multi-platform sync', 'Goal tracking', 'Advanced analytics', 'Achievement system'].map(feature => (
              <li key={feature} className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mt-8">
            <h3 className="font-bold text-indigo-900 mb-2">Get Started Today</h3>
            <p className="text-indigo-700 mb-4">Join thousands of learners tracking their progress</p>
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Sign Up Free
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
