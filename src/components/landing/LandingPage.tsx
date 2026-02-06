'use client';

import React from 'react';

interface LandingPageProps {
  className?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  className = '',
}) => {
  return (
    <div className={`min-h-screen ${className}`}>
      {/* This would compose all landing sections */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white py-32 text-center">
        <h1 className="text-6xl font-bold mb-6">Progress Tracker</h1>
        <p className="text-2xl opacity-90 mb-12">Track, Analyze, Succeed</p>
        <button className="px-10 py-4 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 font-bold text-lg">
          Get Started Free
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
