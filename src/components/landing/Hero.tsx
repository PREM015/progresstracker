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
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-white/10 border border-white/20 backdrop-blur-md mb-8 shadow-sm hover:shadow-md transition-all cursor-default"
        >
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-muted-foreground">v2.0 is now live</span>
        </motion.div>

        {/* Main Heading */}
        <div className="mb-6">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-2">
            <TextReveal text="Track Your Progress" className="justify-center" />
          </h1>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span className="relative inline-block">
              <span className="absolute -inset-2 bg-gradient-to-r from-primary to-purple-600 blur-2xl opacity-20" />
              <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500 animate-gradient-x">
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
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all group relative overflow-hidden">
                <span className="relative z-10 flex items-center">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Button>
            </Link>
          </Magnetic>

          <Magnetic strength={0.2}>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50 transition-all">
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
          <Tilt3D intensity={2}>
            <Spotlight className="rounded-2xl" fill="rgba(255, 255, 255, 0.1)">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-20" />
              <div className="relative rounded-2xl border border-white/20 bg-white/50 dark:bg-black/50 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[16/9] flex items-center justify-center group">
                {/* Placeholder for App Screenshot/Preview */}
                <div className="text-center p-10 transform transition-transform duration-500 group-hover:scale-105">
                  <div className="flex gap-4 justify-center mb-6">
                    <div className="p-4 rounded-2xl bg-primary/10 text-primary animate-float shadow-lg">
                      <BarChart2 className="w-12 h-12" />
                    </div>
                    <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-500 animate-float shadow-lg" style={{ animationDelay: '0.5s' }}>
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <div className="p-4 rounded-2xl bg-pink-500/10 text-pink-500 animate-float shadow-lg" style={{ animationDelay: '1s' }}>
                      <Zap className="w-12 h-12" />
                    </div>
                  </div>
                  <p className="text-muted-foreground font-medium text-lg">Interactive Dashboard Preview</p>
                </div>

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
              </div>
            </Spotlight>
          </Tilt3D>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
