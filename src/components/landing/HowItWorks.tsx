'use client';

import React from 'react';

interface HowItWorksProps {
  className?: string;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({
  className = '',
}) => {
  const steps = [
    { num: '01', title: 'Connect Platforms', desc: 'Link your LeetCode, GitHub, and other accounts to centralize your data.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { num: '02', title: 'Set Goals', desc: 'Define what you want to achieve with specific, measurable milestones.', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { num: '03', title: 'Track Progress', desc: 'Watch your growth in real-time with beautiful, interactive charts.', color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { num: '04', title: 'Achieve Success', desc: 'Celebrate milestones, earn achievements, and share your wins.', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <section className={`py-24 relative bg-background ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground">
            Your journey to mastery in four simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -z-10" />

          {steps.map((step, idx) => (
            <div key={idx} className="relative group">
              <div className={`w-16 h-16 ${step.bg} ${step.color} rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-6 transform group-hover:scale-110 transition-transform duration-300 border border-border bg-background shadow-lg z-10 relative`}>
                {step.num}
              </div>
              <div className="text-center px-4">
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
