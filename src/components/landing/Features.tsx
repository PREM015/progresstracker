'use client';

import React from 'react';

interface FeaturesProps {
  className?: string;
}

export const Features: React.FC<FeaturesProps> = ({
  className = '',
}) => {
  const features = [
    { icon: '📊', title: 'Real-time Tracking', desc: 'Monitor your progress across all platforms in real-time' },
    { icon: '🎯', title: 'Goal Setting', desc: 'Set and track goals to stay motivated' },
    { icon: '📈', title: 'Advanced Analytics', desc: 'Visualize your growth with beautiful charts' },
    { icon: '🏆', title: 'Achievements', desc: 'Earn badges and celebrate milestones' },
    { icon: '🔄', title: 'Auto Sync', desc: 'Automatic sync with your favorite platforms' },
    { icon: '🌍', title: 'Community', desc: 'Compare and compete with friends' },
  ];

  return (
    <section className={`py-20 bg-gray-50 ${className}`}>
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-16">Everything You Need</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white rounded-xl p-8 hover:shadow-xl transition-shadow">
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
