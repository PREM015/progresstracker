'use client';

import React from 'react';

interface HowItWorksProps {
  className?: string;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({
  className = '',
}) => {
  const steps = [
    { num: '1', title: 'Connect Platforms', desc: 'Link your LeetCode, GitHub, and other accounts' },
    { num: '2', title: 'Set Goals', desc: 'Define what you want to achieve' },
    { num: '3', title: 'Track Progress', desc: 'Watch your growth in real-time' },
    { num: '4', title: 'Achieve Success', desc: 'Celebrate milestones and earn achievements' },
  ];

  return (
    <section className={`py-20 ${className}`}>
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.num} className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                {step.num}
              </div>
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
