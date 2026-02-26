'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Quote, RefreshCw, Sparkles, Heart } from 'lucide-react';

interface MotivationWidgetProps {
  className?: string;
}

const quotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Experience is the name everyone gives to their mistakes.", author: "Oscar Wilde" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Programs must be written for people to read.", author: "Harold Abelson" },
  { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Every expert was once a beginner.", author: "Helen Hayes" },
  { text: "Progress, not perfection.", author: "Unknown" },
  { text: "Small daily improvements lead to stunning results.", author: "Robin Sharma" },
  { text: "Consistency beats intensity.", author: "Unknown" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
];

export function MotivationWidget({ className }: MotivationWidgetProps) {
  const [quote, setQuote] = useState(quotes[0]);
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Get a random quote on mount
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  }, []);

  const getNewQuote = () => {
    setIsAnimating(true);
    setTimeout(() => {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * quotes.length);
      } while (quotes[newIndex].text === quote.text);

      setQuote(quotes[newIndex]);
      setIsLiked(false);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className={cn("h-full", className)}
    >
      <div className="glass-card h-full p-6 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl bg-gradient-to-br from-zinc-100/50 dark:from-zinc-900/50 to-indigo-100/20 dark:to-indigo-900/20">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-2xl" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Quote className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Daily Inspiration
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={cn(
                "p-2 rounded-lg transition-all",
                isLiked
                  ? "bg-pink-500/20 text-pink-400"
                  : "hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
            </button>
            <button
              onClick={getNewQuote}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <RefreshCw className={cn(
                "w-4 h-4 transition-transform",
                isAnimating && "animate-spin"
              )} />
            </button>
          </div>
        </div>

        {/* Quote */}
        <div className="flex-1 flex flex-col justify-center relative z-10">
          <motion.div
            key={quote.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="relative">
              <Sparkles className="absolute -top-2 -left-2 w-4 h-4 text-indigo-400/50" />
              <p className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white leading-relaxed italic">
                "{quote.text}"
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent" />
              <p className="text-sm font-bold text-indigo-300">
                — {quote.author}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 relative z-10">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-zinc-600">
            <span>#{Math.floor(Math.random() * 1000).toString().padStart(4, '0')}</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Stay Motivated
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default MotivationWidget;