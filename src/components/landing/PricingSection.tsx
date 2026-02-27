'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Tilt3D } from '@/components/ui/motion/Tilt3D';
import { Spotlight } from '@/components/ui/motion/Spotlight';
import { Magnetic } from '@/components/ui/motion/Magnetic';
import { Globe } from 'lucide-react';
import { TextReveal } from '@/components/ui/motion/TextReveal';
import { GlowBorder } from '@/components/ui/motion/GlowBorder'; // Ensure GlowBorder is imported

interface PricingSectionProps {
  className?: string;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  className = '',
}) => {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      features: ['5 platforms', 'Basic analytics', 'Community support', '7-day history'],
      cta: 'Get Started',
      popular: false
    },
    {
      name: 'Pro',
      price: '$9',
      features: ['Unlimited platforms', 'Advanced analytics', 'Priority support', 'Custom goals', 'Unlimited history', 'API Access'],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Team',
      price: '$29',
      features: ['Everything in Pro', 'Team management', 'Shared dashboards', 'SSO Integration', 'Dedicated Success Manager'],
      cta: 'Contact Sales',
      popular: false
    },
  ];

  return (
    <section className={`py-32 relative overflow-hidden ${className}`}>
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse delay-1000" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 flex justify-center">
            <TextReveal text="Simple, Transparent Pricing" />
          </h2>
          <p className="text-lg text-muted-foreground">Start for free and scale as you grow. No hidden fees.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
          {plans.map((planDisplay, idx) => {
            const CardContent = (
              <Spotlight className="h-full" fill={planDisplay.popular ? "rgba(160, 124, 254, 0.2)" : "rgba(255, 255, 255, 0.1)"}>
                <GlassCard
                  className={`p-8 flex flex-col h-full bg-white/50 dark:bg-black/20 border-transparent hover:shadow-none hover:bg-transparent transition-all duration-500`}
                  hoverEffect={false}
                >
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-2xl font-bold">{planDisplay.name}</h3>
                      {planDisplay.popular && <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">Most Popular</div>}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold tracking-tight">{planDisplay.price}</span>
                      <span className="text-muted-foreground font-medium">/mo</span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {planDisplay.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-green-500" />
                        </div>
                        <span className="text-foreground/80 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Magnetic>
                    <Button
                      variant={planDisplay.popular ? "default" : "outline"}
                      className={`w-full py-6 rounded-xl font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98] ${planDisplay.popular ? 'shadow-lg shadow-primary/25 hover:shadow-primary/40' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                      {planDisplay.cta}
                    </Button>
                  </Magnetic>
                </GlassCard>
              </Spotlight>
            );

            return (
              <Tilt3D key={planDisplay.name} className="h-full" intensity={10}>
                {planDisplay.popular ? (
                  <GlowBorder className="h-full p-0.5 rounded-2xl bg-white/5 dark:bg-white/5" borderRadius={24}>
                    {CardContent}
                  </GlowBorder>
                ) : (
                  <div className="h-full rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    {CardContent}
                  </div>
                )}
              </Tilt3D>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
