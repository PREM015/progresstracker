'use client';

import React from 'react';

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
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex justify-between mb-4">
        {stepTitles.map((title, idx) => (
          <div key={idx} className="flex-1 text-center">
            <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-bold ${idx < currentStep ? 'bg-green-500 text-white' :
                idx === currentStep ? 'bg-indigo-500 text-white' :
                  'bg-gray-200 text-gray-500'
              }`}>
              {idx < currentStep ? '✓' : idx + 1}
            </div>
            <div className={`text-sm ${idx === currentStep ? 'font-semibold' : 'text-gray-500'}`}>
              {title}
            </div>
          </div>
        ))}
      </div>

      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      <div className="text-center mt-4 text-sm text-gray-600">
        Step {currentStep + 1} of {totalSteps}
      </div>
    </div>
  );
};

export default OnboardingProgress;
