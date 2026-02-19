'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Magnetic } from '@/components/ui/motion/Magnetic';
import { TextReveal } from '@/components/ui/motion/TextReveal';

interface CTASectionProps {
  className?: string;
}

export const CTASection: React.FC<CTASectionProps> = ({
  className = '',
}) => {
  return (
    <section className={`py-32 relative overflow-hidden ${className}`}>
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-pink-600 opacity-90 dark:opacity-80" />

      {/* Animated Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container relative z-10 mx-auto px-6 text-center text-white">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium mb-6 border border-white/10 animate-bounce">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>Limited time offer</span>
        </div>

        <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
          <TextReveal text="Ready to Supercharge Your Progress?" className="justify-center text-white" />
        </h2>
        <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
          Join thousands of high-achievers who are crushing their goals and tracking their journey with us.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Magnetic>
            <Link href="/register">
              <Button size="lg" className="h-14 px-10 text-lg bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl hover:scale-105 transition-all rounded-full font-bold relative overflow-hidden group">
                <span className="relative z-10">Start Tracking Free</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shine" />
              </Button>
            </Link>
          </Magnetic>

          <Magnetic strength={0.2}>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="h-14 px-10 text-lg bg-transparent border-white text-white hover:bg-white/20 rounded-full transition-all hover:scale-105">
                View Interactive Demo
              </Button>
            </Link>
          </Magnetic>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 text-sm font-medium text-white/80">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
            No credit card required
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
            14-day free trial on Pro
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
            Cancel anytime
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
