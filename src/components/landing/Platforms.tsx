'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { platforms } from '@/config/platforms';
import { cn } from "@/lib/utils";
import { Code, Github, Briefcase, BookOpen, CheckCircle2, Terminal, Database, Globe, Layers } from 'lucide-react';

// Map categories to icons/colors for visual consistency
const categoryMetadata = {
  dsa: { icon: Code, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/10' },
  git: { icon: Github, color: 'text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800' },
  job: { icon: Briefcase, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/10' },
  learning: { icon: BookOpen, color: 'text-green-600 bg-green-50 dark:bg-green-900/10' },
  other: { icon: Database, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' },
};

interface PlatformsProps {
  className?: string;
}

export const Platforms: React.FC<PlatformsProps> = ({
  className = '',
}) => {
  // Select popular platforms to display on landing page
  // We want a mix of DSA, Git, and Job platforms
  const popularIds = ['leetcode', 'github', 'linkedin', 'codeforces', 'hackerrank', 'gitlab', 'udemy', 'indeed', 'atcoder', 'geeksforgeeks', 'codewars', 'exercism'];

  const displayPlatforms = platforms.filter(p => popularIds.includes(p.slug) || popularIds.includes(p.id)).slice(0, 12);

  return (
    <section className={`py-24 bg-gray-50 dark:bg-zinc-900/30 ${className}`}>
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-4">
            Integrations
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Connect Your Ecosystem</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We support {platforms.length}+ platforms. Connect your competitive programming accounts, git repositories, and job profiles in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {displayPlatforms.map((platform) => {
            const meta = categoryMetadata[platform.category as keyof typeof categoryMetadata] || categoryMetadata.other;
            const Icon = meta.icon;

            return (
              <div
                key={platform.id}
                className={cn(
                  "group relative flex items-center space-x-4 p-5 rounded-2xl",
                  "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950",
                  "transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg"
                )}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${meta.color} transition-colors group-hover:bg-opacity-80`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{platform.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize truncate">{platform.category.replace('_', ' ')}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/platforms">View All {platforms.length} Integrations &rarr;</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Platforms;
