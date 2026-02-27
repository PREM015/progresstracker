'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

interface TestimonialsProps {
  className?: string;
}

export const Testimonials: React.FC<TestimonialsProps> = ({
  className = '',
}) => {
  const testimonials = [
    {
      name: 'Alex Chen',
      role: 'Software Engineer',
      text: "This platform helped me track my progress and land my dream job! The analytics are simply next level.",
      initials: 'AC'
    },
    {
      name: 'Sarah Miller',
      role: 'Product Student',
      text: "Love the analytics! Seeing my growth motivates me every day. It's like a Fitbit for my career goals.",
      initials: 'SM'
    },
    {
      name: 'James Wilson',
      role: 'Senior Developer',
      text: "The best tool for monitoring my coding journey across platforms. The GitHub integration is flawless.",
      initials: 'JW'
    },
    {
      name: 'Emily Davis',
      role: 'UX Designer',
      text: "Beautifully designed and incredibly intuitive. It makes tracking productivity actually fun.",
      initials: 'ED'
    },
    {
      name: 'Michael Brown',
      role: 'Indie Hacker',
      text: "I built my MVP in half the time thanks to the goal tracking features here. Highly recommended!",
      initials: 'MB'
    },
    {
      name: 'Lisa Wang',
      role: 'Data Scientist',
      text: "The data visualization capabilities are exactly what I needed to optimize my study routine.",
      initials: 'LW'
    },
  ];

  return (
    <section className={`py-24 relative overflow-hidden ${className}`}>
      {/* Ambient Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-bold mb-6"
          >
            Loved by Builders
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Join thousands of developers and creators who are shipping faster and tracking better.
          </motion.p>
        </div>

        <div className="relative max-w-[100vw] overflow-hidden pause-on-hover">
          <div className="flex gap-6 animate-marquee w-max">
            {/* Double the testimonials to create seamless loop */}
            {[...testimonials, ...testimonials].map((t, idx) => (
              <GlassCard key={idx} className="w-[350px] md:w-[450px] p-8 flex flex-col justify-between shrink-0 bg-white/60 dark:bg-zinc-900/60 border-white/20 dark:border-white/10 hover:border-primary/30 transition-colors">
                <div className="mb-6">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className="text-yellow-500 text-sm">★</span>
                    ))}
                  </div>
                  <p className="text-lg text-foreground/90 italic leading-relaxed">"{t.text}"</p>
                </div>

                <div className="flex items-center gap-4 mt-auto border-t border-border/50 pt-6">
                  <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-bold text-sm tracking-wider">{t.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-base">{t.name}</div>
                    <div className="text-sm text-primary font-medium">{t.role}</div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Fade Gradients for marque edges */}
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
