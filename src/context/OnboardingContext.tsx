// src/context/OnboardingContext.tsx
// User onboarding flow context

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type OnboardingStep =
  | 'welcome'
  | 'profile'
  | 'connect_platform'
  | 'set_goal'
  | 'explore_dashboard'
  | 'complete';

export interface OnboardingState {
  isActive: boolean;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skippedSteps: OnboardingStep[];
  userData: {
    platformConnected?: boolean;
    goalCreated?: boolean;
    profileCompleted?: boolean;
  };
}

interface OnboardingContextValue {
  state: OnboardingState;
  isStepComplete: (step: OnboardingStep) => boolean;
  goToStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  completeStep: (step: OnboardingStep) => void;
  skipStep: (step: OnboardingStep) => void;
  startOnboarding: () => void;
  dismissOnboarding: () => void;
  setUserData: (data: Partial<OnboardingState['userData']>) => void;
  progress: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STEPS: OnboardingStep[] = [
  'welcome', 'profile', 'connect_platform', 'set_goal', 'explore_dashboard', 'complete'
];

const STORAGE_KEY = 'onboarding_state';

// =============================================================================
// CONTEXT
// =============================================================================

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const defaultState: OnboardingState = {
  isActive: false,
  currentStep: 'welcome',
  completedSteps: [],
  skippedSteps: [],
  userData: {},
};

// =============================================================================
// PROVIDER
// =============================================================================

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(defaultState);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setState(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, []);

  const persist = (s: OnboardingState) => {
    setState(s);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  };

  const isStepComplete = useCallback(
    (step: OnboardingStep) => state.completedSteps.includes(step),
    [state.completedSteps]
  );

  const goToStep = useCallback((step: OnboardingStep) => {
    persist({ ...state, currentStep: step });
  }, [state]);

  const nextStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(state.currentStep);
    const nextIndex = Math.min(currentIndex + 1, STEPS.length - 1);
    persist({ ...state, currentStep: STEPS[nextIndex] });
  }, [state]);

  const completeStep = useCallback((step: OnboardingStep) => {
    const updated: OnboardingState = {
      ...state,
      completedSteps: [...new Set([...state.completedSteps, step])],
    };
    const currentIndex = STEPS.indexOf(step);
    const nextIndex = Math.min(currentIndex + 1, STEPS.length - 1);
    updated.currentStep = STEPS[nextIndex];
    if (nextIndex === STEPS.length - 1) updated.isActive = false;
    persist(updated);
  }, [state]);

  const skipStep = useCallback((step: OnboardingStep) => {
    const updated: OnboardingState = {
      ...state,
      skippedSteps: [...new Set([...state.skippedSteps, step])],
    };
    const currentIndex = STEPS.indexOf(step);
    updated.currentStep = STEPS[Math.min(currentIndex + 1, STEPS.length - 1)];
    persist(updated);
  }, [state]);

  const startOnboarding = useCallback(() => {
    persist({ ...defaultState, isActive: true });
  }, []);

  const dismissOnboarding = useCallback(() => {
    persist({ ...state, isActive: false });
  }, [state]);

  const setUserData = useCallback((data: Partial<OnboardingState['userData']>) => {
    persist({ ...state, userData: { ...state.userData, ...data } });
  }, [state]);

  const progress = Math.round(
    (state.completedSteps.length / (STEPS.length - 1)) * 100
  );

  return (
    <OnboardingContext.Provider value={{
      state, isStepComplete, goToStep, nextStep, completeStep,
      skipStep, startOnboarding, dismissOnboarding, setUserData, progress,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}
