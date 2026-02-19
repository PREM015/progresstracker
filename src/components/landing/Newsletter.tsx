'use client';

import React, { useState } from 'react';
import { Magnetic } from '@/components/ui/motion/Magnetic';
import { GlowBorder } from '@/components/ui/motion/GlowBorder';
import { Send, CheckCircle2 } from 'lucide-react';

interface NewsletterProps {
  className?: string;
}

export const Newsletter: React.FC<NewsletterProps> = ({
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setSubscribed(true);
  };

  if (subscribed) {
    return (
      <section className={`py-20 bg-emerald-50 dark:bg-emerald-900/10 ${className}`}>
        <div className="container mx-auto px-6 text-center animate-in fade-in zoom-in duration-500">
          <div className="text-6xl mb-4 flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-400 mb-2">Thank You!</h3>
          <p className="text-emerald-700 dark:text-emerald-300">You're subscribed to our newsletter</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-20 bg-indigo-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800 ${className}`}>
      <div className="container mx-auto px-6 max-w-2xl text-center">
        <h2 className="text-4xl font-bold mb-4 text-zinc-900 dark:text-zinc-50 tracking-tight">Stay Updated</h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-lg">Get the latest tips and updates delivered to your inbox.</p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <GlowBorder className="w-full rounded-xl bg-white dark:bg-zinc-950 p-0.5" borderRadius={12} duration={3}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full h-full px-6 py-4 rounded-[10px] bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all border-none focus:ring-0"
              />
            </GlowBorder>
          </div>

          <Magnetic strength={0.2}>
            <button
              type="submit"
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              Subscribe
              <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </Magnetic>
        </form>
      </div>
    </section>
  );
};

export default Newsletter;
