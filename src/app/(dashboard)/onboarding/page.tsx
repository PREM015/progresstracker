"use client";

import { useState } from "react";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await fetch('/api/user/onboarding/complete', { method: 'POST' });
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden noise-overlay">
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 -right-4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-4xl relative z-10 scale-in">
        <OnboardingFlow onComplete={handleComplete} />

        {isCompleting && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-10 text-center max-w-xs w-full animate-spring">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6"></div>
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Finalizing your setup</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
