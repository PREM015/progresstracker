'use client';

import React from 'react';

interface HowItWorksProps {
  className?: string;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({
  className = '',
}) => {
  const steps = [
    { num: '01', title: 'Connect Platforms', desc: 'Link your LeetCode, GitHub, and other accounts to centralize your data.', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { num: '02', title: 'Set Goals', desc: 'Define what you want to achieve with specific, measurable milestones.', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { num: '03', title: 'Track Progress', desc: 'Watch your growth in real-time with beautiful, interactive charts.', color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { num: '04', title: 'Achieve Success', desc: 'Celebrate milestones, earn achievements, and share your wins.', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <section className={`py-32 relative bg-background/50 noise-overlay border-y border-white/5 ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tight">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground font-medium">
            Your journey to mastery in four simple steps. Built for momentum.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-12 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -z-10" />

          {steps.map((step, idx) => (
            <div key={idx} className="relative group text-center">
              <div className={`w-24 h-24 ${step.bg} ${step.color} rounded-[2rem] flex items-center justify-center text-3xl font-black mx-auto mb-8 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 glass border-white/20 shadow-2xl z-10 relative`}>
                {step.num}
              </div>
              <div className="px-4">
                <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors tracking-tight">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed font-medium">
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
