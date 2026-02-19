'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code, Github, Briefcase, BookOpen, CheckCircle2, Terminal, Database, Globe, Layers } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { platforms } from '@/config/platforms';

// UI Metadata for categories
const categoryMetadata = {
    dsa: {
        name: 'Competitive Programming',
        icon: Code,
        color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10',
    },
    git: {
        name: 'Version Control',
        icon: Github,
        color: 'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800',
    },
    job: {
        name: 'Job Boards',
        icon: Briefcase,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-600/10',
    },
    learning: {
        name: 'Learning Platforms',
        icon: BookOpen,
        color: 'text-green-600 bg-green-50 dark:bg-green-600/10',
    },
    hackathon: {
        name: 'Hackathons',
        icon: Terminal,
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-600/10',
    },
    opensource: {
        name: 'Open Source',
        icon: Globe,
        color: 'text-teal-600 bg-teal-50 dark:bg-teal-600/10',
    },
    design: {
        name: 'Design',
        icon: Layers,
        color: 'text-pink-600 bg-pink-50 dark:bg-pink-600/10',
    },
    other: {
        name: 'Other',
        icon: Database,
        color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-600/10',
    }
};

interface PlatformShowcaseProps {
    connectedPlatforms?: string[];
}

export function PlatformShowcase({ connectedPlatforms = [] }: PlatformShowcaseProps) {
    // Group platforms by category
    const platformsByCategory = platforms.reduce((acc, platform) => {
        const cat = platform.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(platform);
        return acc;
    }, {} as Record<string, typeof platforms>);

    // Determine which categories to show (prioritize ones with content)
    const displayCategories = ['dsa', 'git', 'job', 'learning', 'hackathon', 'opensource', 'design']
        .filter(cat => platformsByCategory[cat]?.length > 0)
        .slice(0, 8); // Show up to 8 categories

    return (
        <Card className="border-indigo-100 dark:border-indigo-900/20 bg-gradient-to-br from-white to-indigo-50/20 dark:from-zinc-950 dark:to-indigo-950/20 shadow-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl">Available Integrations</CardTitle>
                        <CardDescription>Connect {platforms.length}+ platforms from diverse categories</CardDescription>
                    </div>
                    <Button asChild variant="default" className="bg-indigo-600 hover:bg-indigo-500">
                        <Link href="/platforms">View All Platforms</Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {displayCategories.map((catKey, i) => {
                        const metadata = categoryMetadata[catKey as keyof typeof categoryMetadata] || categoryMetadata.other;
                        const categoryPlatforms = platformsByCategory[catKey] || [];
                        const displayCount = 5;
                        const hasMore = categoryPlatforms.length > displayCount;
                        const Icon = metadata.icon;

                        return (
                            <motion.div
                                key={catKey}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:shadow-md transition-shadow group cursor-pointer h-full"
                            >
                                <Link href={`/platforms?category=${catKey}`} className="flex flex-col h-full">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-lg ${metadata.color} group-hover:scale-110 transition-transform`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{metadata.name}</h3>
                                    </div>
                                    <div className="space-y-2 flex-grow">
                                        {categoryPlatforms.slice(0, displayCount).map(p => {
                                            const isConnected = connectedPlatforms.includes(p.slug) || connectedPlatforms.includes(p.id); // Check both slug and id just in case
                                            return (
                                                <div key={p.id} className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                                                        <span className="truncate">{p.name}</span>
                                                    </div>
                                                    {isConnected && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                                                </div>
                                            );
                                        })}
                                        {hasMore && (
                                            <div className="text-xs text-indigo-500 font-medium pl-3 pt-1">
                                                + {categoryPlatforms.length - displayCount} more
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
