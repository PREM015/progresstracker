'use client';

import React from 'react';
import { Check, Minus, Terminal, Cpu } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PricingTier {
    name: string;
    price: string;
    description: string;
    features: string[];
    missing?: string[];
    popular?: boolean;
    color: string;
}

const tiers: PricingTier[] = [
    {
        name: 'BASIC_UNIT',
        price: '$0',
        description: 'Standard operational capacity.',
        features: [
            'Basic Activity Log',
            '7-Day Data Retention',
            'Public Leaderboard Access',
            'Community Support'
        ],
        missing: [
            'Neural Analytics',
            'AI Goal Generation',
            'Data Export (PDF/CSV)',
            'Custom Interface'
        ],
        color: 'gray'
    },
    {
        name: 'PRO_MODULE',
        price: '$9',
        description: 'Enhanced cognitive processing.',
        popular: true,
        features: [
            'Everything in Basic',
            'Infinite Data Retention',
            'Deep Neural Analytics',
            'AI Goal Generation',
            'Priority Data Export',
            '24/7 Command Support',
            'Custom Cyber Themes'
        ],
        color: 'purple'
    }
];

export function PricingTable({ className }: { className?: string }) {
    return (
        <div className={cn("grid md:grid-cols-2 gap-8 max-w-5xl mx-auto", className)}>
            {tiers.map((tier) => (
                <GlassCard
                    key={tier.name}
                    className={cn(
                        "relative flex flex-col p-1 overflow-hidden transition-all duration-500",
                        tier.popular ? "!bg-black/80 !border-purple-500/50 shadow-[0_0_50px_-12px_rgba(168,85,247,0.3)]" : "!bg-black/60 !border-white/5"
                    )}
                    glowColor={tier.popular ? "#a855f7" : undefined}
                >
                    {/* Inner Content Container */}
                    <div className="relative h-full bg-black/40 rounded-xl p-8 flex flex-col z-10">

                        {tier.popular && (
                            <div className="absolute top-0 right-0">
                                <div className="bg-purple-600 text-white text-[10px] font-mono font-bold px-4 py-1 rounded-bl-xl uppercase tracking-widest animate-pulse">
                                    Recommended Module
                                </div>
                            </div>
                        )}

                        <div className="mb-8 border-b border-white/5 pb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Terminal className={cn("w-5 h-5", tier.popular ? "text-purple-400" : "text-gray-500")} />
                                <h3 className={cn("text-lg font-mono font-bold tracking-widest", tier.popular ? "text-purple-400" : "text-gray-400")}>
                                    {tier.name}
                                </h3>
                            </div>

                            <div className="flex items-baseline gap-1">
                                <span className={cn("text-5xl font-black tracking-tighter", tier.popular ? "text-white" : "text-gray-300")}>
                                    {tier.price}
                                </span>
                                <span className="text-gray-500 font-mono text-sm">/mo</span>
                            </div>
                            <p className="mt-4 text-gray-400 text-sm font-light border-l-2 border-white/10 pl-3">
                                {tier.description}
                            </p>
                        </div>

                        <div className="flex-1 space-y-5 mb-8">
                            {tier.features.map((feature) => (
                                <div key={feature} className="flex items-start gap-3 group">
                                    <div className={cn(
                                        "p-0.5 mt-0.5 transition-colors",
                                        tier.popular ? "text-purple-400 group-hover:text-purple-300" : "text-gray-500"
                                    )}>
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm text-gray-300 font-mono group-hover:text-white transition-colors">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                            {tier.missing?.map((feature) => (
                                <div key={feature} className="flex items-start gap-3 opacity-30">
                                    <div className="p-0.5 mt-0.5">
                                        <Minus className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm text-gray-500 font-mono decoration-slate-600">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <Button
                            className={cn(
                                "w-full py-6 rounded-lg font-mono tracking-widest uppercase transition-all duration-300",
                                tier.popular
                                    ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/50"
                                    : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 hover:border-white/20"
                            )}
                        >
                            {tier.name === 'BASIC_UNIT' ? 'Current System' : 'Install Upgrade'}
                        </Button>
                    </div>
                </GlassCard>
            ))}
        </div>
    );
}
