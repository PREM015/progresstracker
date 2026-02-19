'use client';

import React from 'react';
import { Check, Sparkles, Zap, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProPlanCardProps {
    className?: string;
    onUpgrade?: () => void;
    isPro?: boolean;
}

export function ProPlanCard({ className, onUpgrade, isPro = false }: ProPlanCardProps) {
    return (
        <div className={cn("relative group", className)}>
            {/* Animated border gradient */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>

            <GlassCard className="relative h-full !bg-black/90 !border-white/10 overflow-hidden" glowColor={isPro ? "#8b5cf6" : "#ec4899"}>
                {/* Tech background grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                {/* Scanner line effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50 animate-scan pointer-events-none" />

                <div className="relative p-8 flex flex-col md:flex-row items-center justify-between gap-8 z-10">
                    <div className="space-y-6 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/50 text-purple-400 font-mono text-xs tracking-widest uppercase">
                            <Cpu className="w-3 h-3 animate-pulse" />
                            <span>System Status: {isPro ? 'OPTIMIZED' : 'STANDARD'}</span>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400 tracking-tight">
                                {isPro ? "PRO ACCESS ACTIVE" : "UNLEASH FULL POWER"}
                            </h3>
                            <p className="text-gray-400 text-lg font-light leading-relaxed">
                                {isPro
                                    ? "You are operating at maximum efficiency. All advanced systems are online."
                                    : "Upgrade to Pro to unlock advanced neural analytics, unlimited timeline retention, and priority command channels."
                                }
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {['Neural Analytics', 'Infinite History', 'Priority Uplink', 'Custom Protocols'].map((feature) => (
                                <div key={feature} className="flex items-center gap-3">
                                    <div className={`p-1 rounded bg-gray-800 border ${isPro ? 'border-purple-500/50 text-purple-400' : 'border-gray-700 text-gray-500'}`}>
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <span className="text-sm text-gray-300 font-mono">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-shrink-0 w-full md:w-auto">
                        <div className="relative">
                            {/* Button Glow backing */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500" />

                            {isPro ? (
                                <Button className="relative w-full md:w-auto bg-gray-900 hover:bg-gray-800 text-white border border-white/10 shadow-2xl px-8 py-8 text-lg rounded-xl font-mono uppercase tracking-widest">
                                    Manage Uplink
                                </Button>
                            ) : (
                                <Button
                                    onClick={onUpgrade}
                                    className="relative w-full md:w-auto bg-white text-black hover:bg-gray-100 border-0 shadow-[0_0_20px_rgba(168,85,247,0.5)] px-10 py-8 text-lg rounded-xl flex items-center justify-center gap-3 group/btn overflow-hidden"
                                >
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                                    <Zap className="w-6 h-6 fill-current group-hover/btn:rotate-12 transition-transform" />
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-xs font-bold tracking-widest opacity-60">INITIATE</span>
                                        <span className="font-black tracking-tighter">UPGRADE</span>
                                    </div>
                                </Button>
                            )}
                        </div>
                        {!isPro && (
                            <p className="text-center text-gray-500 text-[10px] uppercase tracking-widest mt-4 font-mono">
                                Secure Encrypted Transaction
                            </p>
                        )}
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
