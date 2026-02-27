import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { User, Share2, Target, ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  className?: string;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  onNext,
  className = '',
}) => {
  const listItems = [
    { icon: <User className="h-6 w-6" />, title: 'Setup Profile', desc: 'Tell us about your coding background.', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { icon: <Share2 className="h-6 w-6" />, title: 'Connect Platforms', desc: 'Sync with GitHub, LeetCode, and more.', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: <Target className="h-6 w-6" />, title: 'Set Goals', desc: 'Define your journey and track success.', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  ];

  return (
    <div className={`glass-card p-12 text-center relative overflow-hidden ${className}`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="text-7xl mb-8"
      >
        🚀
      </motion.div>

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-white"
      >
        Welcome to your <span className="text-gradient">Next Level</span>
      </motion.h2>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto font-medium"
      >
        Let's get your account set up in just a few simple steps. Your growth starts now.
      </motion.p>

      <div className="grid md:grid-cols-3 gap-6 mb-12 relative z-10">
        {listItems.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 + idx * 0.1 }}
            className="p-6 rounded-2xl glass border-white/5 group hover:bg-white/5 transition-colors text-left"
          >
            <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
              {item.icon}
            </div>
            <h3 className="font-bold text-white mb-2">{item.title}</h3>
            <p className="text-sm text-zinc-500 font-medium leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Button
          onClick={onNext}
          variant="premium"
          size="xl"
          className="group"
        >
          Let's Get Started
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </motion.div>
    </div>
  );
};

export default WelcomeStep;

