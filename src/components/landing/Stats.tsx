'use client';

import React from 'react';

interface StatsProps {
  className?: string;
}

export const Stats: React.FC<StatsProps> = ({
  className = '',
}) => {
  const stats = [
    { value: '50K+', label: 'Active Users' },
    { value: '2M+', label: 'Problems Tracked' },
    { value: '100+', label: 'Platforms Supported' },
    { value: '99%', label: 'User Satisfaction' },
  ];

  return (
    <section className={`py-20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white ${className}`}>
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-5xl font-bold mb-2">{stat.value}</div>
              <div className="text-lg opacity-90">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
