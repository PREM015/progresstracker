'use client';

import React from 'react';

interface PlatformsProps {
  className?: string;
}

export const Platforms: React.FC<PlatformsProps> = ({
  className = '',
}) => {
  const platforms = [
    { name: 'LeetCode', icon: '💻', color: 'from-orange-500 to-red-500' },
    { name: 'GitHub', icon: '🐙', color: 'from-gray-700 to-gray-900' },
    { name: 'HackerRank', icon: '🎯', color: 'from-green-500 to-emerald-500' },
    { name: 'Codeforces', icon: '🏅', color: 'from-blue-500 to-indigo-500' },
    { name: 'Kaggle', icon: '📊', color: 'from-cyan-500 to-blue-500' },
    { name: 'Coursera', icon: '🎓', color: 'from-indigo-500 to-purple-500' },
  ];

  return (
    <section className={`py-20 ${className}`}>
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-4">Supported Platforms</h2>
        <p className="text-gray-600 text-center mb-16">Connect with your favorite learning platforms</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className={`bg-gradient-to-br ${platform.color} text-white rounded-xl p-6 text-center hover:scale-105 transition-transform`}
            >
              <div className="text-4xl mb-3">{platform.icon}</div>
              <div className="font-bold">{platform.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Platforms;
