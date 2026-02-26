import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, Target, Share2, Star } from 'lucide-react';

interface CompletionStepProps {
  userName: string;
  className?: string;
}

export const CompletionStep: React.FC<CompletionStepProps> = ({
  userName,
  className = '',
}) => {
  const nextSteps = [
    { icon: <Rocket className="h-6 w-6" />, title: 'First Entry', desc: 'Log your progress.', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { icon: <Target className="h-6 w-6" />, title: 'Set Goals', desc: 'Define objectives.', color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { icon: <Share2 className="h-6 w-6" />, title: 'Connect', desc: 'Sync more platforms.', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className={`glass-card p-12 text-center relative overflow-hidden ${className}`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -ml-32 -mb-32" />

      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 10, stiffness: 100 }}
        className="text-8xl mb-8"
      >
        🎉
      </motion.div>

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-white"
      >
        You're All Set, <span className="text-gradient">{userName}</span>!
      </motion.h2>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-zinc-400 mb-12 font-medium"
      >
        Your growth engine is now fully operational.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="p-8 rounded-3xl glass border-white/5 relative z-10"
      >
        <h3 className="font-bold text-white mb-8 flex items-center justify-center gap-2">
          <Star className="h-5 w-5 fill-primary text-primary" />
          Ready to Explore?
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {nextSteps.map((step, idx) => (
            <div key={idx} className="group flex flex-col items-center">
              <div className={`w-14 h-14 ${step.bg} ${step.color} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                {step.icon}
              </div>
              <div className="font-bold text-white text-sm mb-1">{step.title}</div>
              <div className="text-xs text-zinc-500 font-medium">{step.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default CompletionStep;

