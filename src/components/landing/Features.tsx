'use client';

import React, { useRef } from 'react';
import { BentoGrid, BentoGridItem } from '@/components/ui/BentoGrid';
import { BarChart3, Target, Trophy, RefreshCw, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { TextReveal } from '@/components/ui/motion/TextReveal';
import { GlowBorder } from '@/components/ui/motion/GlowBorder';

interface FeaturesProps {
  className?: string;
}

export const Features: React.FC<FeaturesProps> = ({
  className = '',
}) => {
  const containerRef = useRef(null);

  const features = [
    {
      title: "Real-time Tracking",
      description: "Monitor your progress across all platforms in real-time with millisecond precision.",
      header: (
        <div className="flex flex-1 w-full min-h-[10rem] rounded-xl bg-gradient-to-br from-indigo-500/10 via-primary/10 to-purple-500/10 border border-white/10 p-4 overflow-hidden relative group-hover/bento:border-primary/30 transition-colors">
          <div className="flex flex-col gap-2">
            <div className="h-2 w-2/3 bg-primary/20 rounded-full animate-pulse" />
            <div className="h-2 w-full bg-white/10 rounded-full" />
            <div className="h-2 w-3/4 bg-white/10 rounded-full" />
            <div className="mt-4 flex gap-2">
              <div className="h-12 w-12 rounded-lg bg-primary/20 animate-pulse" />
              <div className="flex-1 flex flex-col gap-2 justify-center">
                <div className="h-2 w-full bg-primary/20 rounded-full" />
                <div className="h-2 w-2/3 bg-white/10 rounded-full" />
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover/bento:scale-150 transition-transform duration-700" />
        </div>
      ),
      icon: <BarChart3 className="h-5 w-5 text-indigo-500" />,
      className: "md:col-span-2",
    },
    {
      title: "Goal Setting",
      description: "Set SMART goals and track your journey to success.",
      header: (
        <div className="flex flex-1 w-full min-h-[10rem] rounded-xl bg-gradient-to-br from-pink-500/10 via-rose-500/10 to-red-500/10 border border-white/10 p-4 relative overflow-hidden">
          <div className="absolute top-4 right-4 h-12 w-12 rounded-full border-4 border-pink-500/20 border-t-pink-500 animate-spin" />
          <div className="mt-12">
            <div className="h-4 w-4 bg-pink-500 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
          </div>
        </div>
      ),
      icon: <Target className="h-5 w-5 text-pink-500" />,
      className: "md:col-span-1",
    },
    {
      title: "Achievements",
      description: "Earn badges and level up as you complete tasks.",
      header: (
        <div className="flex flex-1 w-full min-h-[10rem] rounded-xl bg-gradient-to-br from-yellow-400/10 via-orange-500/10 to-red-500/10 border border-white/10 p-4 flex items-center justify-center">
          <Trophy className="h-16 w-16 text-yellow-500/50 animate-bounce" />
        </div>
      ),
      icon: <Trophy className="h-5 w-5 text-yellow-500" />,
      className: "md:col-span-1",
    },
    {
      title: "Auto-Synchronization",
      description: "Seamlessly sync data between all your devices automatically.",
      header: (
        <div className="flex flex-1 w-full min-h-[10rem] rounded-xl bg-gradient-to-br from-emerald-400/10 via-green-500/10 to-teal-500/10 border border-white/10 p-4 overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className="h-20 w-20 text-emerald-500/20 animate-[spin_10s_linear_infinite]" />
          </div>
          <div className="relative z-10 flex flex-col gap-2">
            <div className="h-8 w-8 rounded bg-emerald-500/20" />
            <div className="h-8 w-8 rounded bg-emerald-500/20 translate-x-12" />
            <div className="h-8 w-8 rounded bg-emerald-500/20 translate-x-24" />
          </div>
        </div>
      ),
      icon: <RefreshCw className="h-5 w-5 text-emerald-500" />,
      className: "md:col-span-2",
    },
    {
      title: "Global Community",
      description: "Connect with others and share your winning streaks.",
      header: (
        <div className="flex flex-1 w-full min-h-[10rem] rounded-xl bg-gradient-to-br from-indigo-400/10 via-violet-500/10 to-purple-500/10 border border-white/10 p-4 overflow-hidden relative">
          <Globe className="absolute -bottom-8 -right-8 h-32 w-32 text-indigo-500/10 rotate-12" />
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-zinc-800" />
            ))}
          </div>
        </div>
      ),
      icon: <Globe className="h-5 w-5 text-indigo-500" />,
      className: "md:col-span-1",
    },
  ];

  return (
    <section className={`py-32 relative overflow-hidden bg-background/50 noise-overlay ${className}`} ref={containerRef}>
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] opacity-30 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[120px] opacity-30 animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full glass border-white/20 text-sm font-semibold tracking-wide uppercase text-primary">
            Premium Features
          </div>

          <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-foreground">
            <TextReveal text="Everything You Need" className="justify-center" />
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground leading-relaxed font-medium"
          >
            Power-packed features designed to boost your productivity and visualize your journey.
          </motion.p>
        </div>

        <BentoGrid className="max-w-6xl mx-auto">
          {features.map((item, i) => (
            <BentoGridItem
              key={i}
              title={item.title}
              description={item.description}
              header={item.header}
              icon={item.icon}
              className={`${item.className} glass-card border-white/10`}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
};


export default Features;
