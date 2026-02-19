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
      header: <div className="flex flex-1 w-full min-h-[6rem] rounded-xl bg-gradient-to-br from-blue-500/20 via-primary/20 to-purple-500/20 border border-black/5 dark:border-white/10" />,
      icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
      className: "md:col-span-2",
    },
    {
      title: "Goal Setting",
      description: "Set SMART goals and track your journey to success with ease.",
      header: <div className="flex flex-1 w-full min-h-[6rem] rounded-xl bg-gradient-to-br from-pink-500/20 via-rose-500/20 to-red-500/20 border border-black/5 dark:border-white/10" />,
      icon: <Target className="h-5 w-5 text-pink-500" />,
      className: "md:col-span-1",
    },
    {
      title: "Gamified Achievements",
      description: "Earn badges and level up as you complete your tasks and milestones.",
      header: <div className="flex flex-1 w-full min-h-[6rem] rounded-xl bg-gradient-to-br from-yellow-400/20 via-orange-500/20 to-red-500/20 border border-black/5 dark:border-white/10" />,
      icon: <Trophy className="h-5 w-5 text-yellow-500" />,
      className: "md:col-span-1",
    },
    {
      title: "Auto-Synchronization",
      description: "Seamlessly sync data between your mobile devices and desktop automatically.",
      header: <div className="flex flex-1 w-full min-h-[6rem] rounded-xl bg-gradient-to-br from-emerald-400/20 via-green-500/20 to-teal-500/20 border border-black/5 dark:border-white/10" />,
      icon: <RefreshCw className="h-5 w-5 text-emerald-500" />,
      className: "md:col-span-2",
    },
    {
      title: "Global Community",
      description: "Connect with like-minded individuals and share your winning streaks.",
      header: <div className="flex flex-1 w-full min-h-[6rem] rounded-xl bg-gradient-to-br from-indigo-400/20 via-violet-500/20 to-purple-500/20 border border-black/5 dark:border-white/10" />,
      icon: <Globe className="h-5 w-5 text-indigo-500" />,
      className: "md:col-span-1",
    },
  ];

  return (
    <section className={`py-32 relative overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/50 ${className}`} ref={containerRef}>
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-30 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-30 animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <GlowBorder className="inline-block mb-6 p-0.5 rounded-full overflow-hidden bg-white/50 dark:bg-black/50 backdrop-blur-sm" borderRadius={100} duration={4}>
            <div className="text-sm font-semibold tracking-wide uppercase px-4 py-1.5 rounded-full bg-linear-to-r from-primary/10 to-purple-500/10 text-primary">
              Premium Features
            </div>
          </GlowBorder>

          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-foreground">
            <TextReveal text="Everything You Need to Succeed" className="justify-center" />
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground leading-relaxed"
          >
            Power-packed features designed to boost your productivity.
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
              className={`${item.className} border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50`}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
};

export default Features;
