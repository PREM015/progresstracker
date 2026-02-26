'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import WelcomeStep from './WelcomeStep';
import ProfileSetupStep from './ProfileSetupStep';
import PlatformConnectStep from './PlatformConnectStep';
import PreferencesStep from './PreferencesStep';
import GoalSetupStep from './GoalSetupStep';
import CompletionStep from './CompletionStep';
import OnboardingProgress from './OnboardingProgress';

interface OnboardingFlowProps {
  className?: string;
  onComplete?: () => void;
}

type StepKey = 'welcome' | 'profile' | 'platforms' | 'preferences' | 'goals' | 'complete';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  className = '',
  onComplete,
}) => {
  const steps: { key: StepKey; title: string }[] = [
    { key: 'welcome', title: 'Welcome' },
    { key: 'profile', title: 'Profile' },
    { key: 'platforms', title: 'Platforms' },
    { key: 'preferences', title: 'Preferences' },
    { key: 'goals', title: 'Goals' },
    { key: 'complete', title: 'Complete' },
  ];

  const [currentStep, setCurrentStep] = useState<StepKey>('welcome');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchState = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/user/onboarding');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to load onboarding');
        const data = json?.data || json;
        setCurrentStep(data.currentStep || 'welcome');
        setStepData(data.stepData || {});
      } catch (err: any) {
        setError(err.message || 'Failed to load onboarding');
      } finally {
        setLoading(false);
      }
    };

    fetchState();
  }, []);

  const markStepComplete = async (step: StepKey, data?: Record<string, any>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, completed: true, data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to update onboarding');
      const updated = json?.data || json;
      setCurrentStep(updated.currentStep || step);
      if (data) {
        setStepData((prev) => ({ ...prev, [step]: data }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update onboarding');
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = async (data: { name: string; bio?: string }) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, bio: data.bio || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to update profile');
      await markStepComplete('profile', data);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      setSaving(false);
    }
  };

  const checkPlatforms = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/platforms/connected?activeOnly=true');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to check platforms');
      const connections = json?.data?.connections || [];
      if (connections.length === 0) {
        setError('Connect at least one platform to continue.');
        setSaving(false);
        return;
      }
      await markStepComplete('platforms');
    } catch (err: any) {
      setError(err.message || 'Failed to check platforms');
      setSaving(false);
    }
  };

  const savePreferences = async (prefs: any) => {
    await markStepComplete('preferences', prefs);
  };

  const createGoalsFromTemplates = async (goals: { templateId: string; title: string; target: number; category: string }[]) => {
    setSaving(true);
    setError(null);
    try {
      if (goals.length === 0) {
        await markStepComplete('goals', { count: 0 });
        return;
      }
      for (const goal of goals) {
        const res = await fetch('/api/goals/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: goal.templateId,
            customizations: { target: goal.target },
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to create goal');
      }
      await markStepComplete('goals', { count: goals.length });
    } catch (err: any) {
      setError(err.message || 'Failed to create goals');
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      await fetch('/api/user/onboarding/complete', { method: 'POST' });
      onComplete?.();
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setSaving(false);
    }
  };

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className={cn("relative z-10", className)}>
      <OnboardingProgress
        currentStep={Math.max(currentIndex, 0)}
        totalSteps={steps.length}
        stepTitles={steps.map((s) => s.title)}
      />

      <div className="mt-12 scale-in">
        {loading ? (
          <div className="glass-card p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-zinc-400 font-medium">Loading your journey...</p>
          </div>
        ) : (
          <div className="relative">
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-xl font-medium animate-spring">
                {error}
              </div>
            )}

            <div className="space-y-8">
              {currentStep === 'welcome' && (
                <WelcomeStep onNext={() => markStepComplete('welcome')} />
              )}

              {currentStep === 'profile' && (
                <ProfileSetupStep onNext={updateProfile} />
              )}

              {currentStep === 'platforms' && (
                <PlatformConnectStep onNext={checkPlatforms} />
              )}

              {currentStep === 'preferences' && (
                <PreferencesStep onNext={savePreferences} />
              )}

              {currentStep === 'goals' && (
                <GoalSetupStep onNext={createGoalsFromTemplates} />
              )}

              {currentStep === 'complete' && (
                <div className="space-y-8">
                  <CompletionStep userName={stepData.profile?.name || 'there'} />
                  <button
                    onClick={handleComplete}
                    disabled={saving}
                    className="w-full h-14 text-lg font-bold rounded-2xl transition-all active:scale-[0.98] premium text-white disabled:opacity-50 shadow-2xl flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Finalizing...
                      </>
                    ) : (
                      'Take me to my Dashboard'
                    )}
                  </button>
                </div>
              )}
            </div>

            {saving && currentStep !== 'complete' && (
              <div className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-500 font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating your progress...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


export default OnboardingFlow;
