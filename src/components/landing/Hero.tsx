'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart2, CheckCircle2, Zap } from 'lucide-react';
import { TextReveal } from '@/components/ui/motion/TextReveal';
import { Tilt3D } from '@/components/ui/motion/Tilt3D';
import { Spotlight } from '@/components/ui/motion/Spotlight';
import { Magnetic } from '@/components/ui/motion/Magnetic';

export const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32 noise-overlay">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-[80px] animate-pulse delay-500" />
      </div>


      <div className="container relative z-10 mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border-white/20 mb-8 shadow-sm hover:shadow-md transition-all cursor-default"
        >
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">v2.0 is now live</span>
        </motion.div>


        {/* Main Heading */}
        <div className="mb-8">
          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-2">
            <TextReveal text="Track Your Progress" className="justify-center" />
          </h1>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight">
            <span className="relative inline-block px-4">
              <span className="absolute -inset-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 blur-3xl opacity-30" />
              <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-x py-2">
                Like Never Before
              </span>
            </span>
          </h1>
        </div>


        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
        >
          The all-in-one platform to set goals, track milestones, and visualize your journey to success. Simple, powerful, and beautiful.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
          <Magnetic>
            <Link href="/register">
              <Button variant="premium" size="xl" className="group">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </Magnetic>

          <Magnetic strength={0.2}>
            <Link href="/demo">
              <Button variant="glass" size="xl">
                View Live Demo
              </Button>
            </Link>
          </Magnetic>

        </motion.div>

        {/* Floating UI Mockup Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative max-w-5xl mx-auto perspective-1000"
        >
          <Tilt3D intensity={1}>
            <Spotlight className="rounded-3xl" fill="rgba(99, 102, 241, 0.15)">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-30" />
              <div className="relative rounded-3xl border border-white/20 bg-white/40 dark:bg-black/40 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden aspect-[21/9] flex items-center justify-center group overflow-hidden">
                {/* Simulated Dashboard Content */}
                <div className="absolute inset-0 grid grid-cols-12 gap-4 p-6 opacity-40 group-hover:opacity-60 transition-opacity">
                  <div className="col-span-3 h-full bg-white/5 rounded-xl border border-white/10" />
                  <div className="col-span-9 flex flex-col gap-4">
                    <div className="h-24 bg-white/10 rounded-xl" />
                    <div className="grid grid-cols-3 gap-4 h-full">
                      <div className="bg-white/5 rounded-xl border border-white/5" />
                      <div className="bg-white/5 rounded-xl border border-white/5" />
                      <div className="bg-white/5 rounded-xl border border-white/5" />
                    </div>
                  </div>
                </div>

                <div className="relative text-center p-10 transform transition-all duration-700 group-hover:scale-110">
                  <div className="flex gap-8 justify-center mb-8">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="p-6 rounded-3xl bg-indigo-500/10 text-indigo-400 shadow-xl border border-indigo-500/20"
                    >
                      <BarChart2 className="w-16 h-16" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                      className="p-6 rounded-3xl bg-purple-500/10 text-purple-400 shadow-xl border border-purple-500/20"
                    >
                      <CheckCircle2 className="w-16 h-16" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                      className="p-6 rounded-3xl bg-pink-500/10 text-pink-400 shadow-xl border border-pink-500/20"
                    >
                      <Zap className="w-16 h-16" />
                    </motion.div>
                  </div>
                  <p className="text-white font-bold text-2xl tracking-wide shimmer-text">Experience the Momentum</p>
                </div>

                {/* Glass Glow */}
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              </div>
            </Spotlight>
          </Tilt3D>

        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
