import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  className?: string;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
  className = '',
}) => {
  const percentage = (currentStep / (totalSteps - 1)) * 100;

  return (
    <div className={cn("relative w-full max-w-3xl mx-auto px-4", className)}>
      {/* Progress Line Background */}
      <div className="absolute top-5 left-[calc(10%+20px)] right-[calc(10%+20px)] h-0.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
        />
      </div>

      <div className="relative flex justify-between items-start">
        {stepTitles.map((title, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <div key={idx} className="flex flex-col items-center group relative z-10">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  backgroundColor: isCompleted ? "var(--primary)" : isActive ? "var(--zinc-900)" : "var(--zinc-900)",
                }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                  isCompleted ? "border-primary bg-primary text-white" :
                    isActive ? "border-primary bg-zinc-900 shadow-[0_0_15px_rgba(99,102,241,0.3)]" :
                      "border-white/10 bg-zinc-900 text-zinc-600"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 stroke-[3px]" />
                ) : (
                  <span className={cn("text-sm font-black", isActive ? "text-white" : "text-zinc-600")}>
                    {idx + 1}
                  </span>
                )}
              </motion.div>

              <div className="mt-4 flex flex-col items-center max-w-[80px]">
                <span className={cn(
                  "text-[10px] uppercase tracking-widest font-black transition-colors duration-300 whitespace-nowrap",
                  isActive ? "text-primary" : isCompleted ? "text-zinc-400" : "text-zinc-600"
                )}>
                  {title}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="progress-dot"
                    className="w-1.5 h-1.5 bg-primary rounded-full mt-1 animate-pulse"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingProgress;

