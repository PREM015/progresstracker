'use client';

import React, { useState } from 'react';

interface OnboardingStepProps {
    step: number;
    totalSteps: number;
    title: string;
    description: string;
    onNext: () => void;
    onPrev?: () => void;
    onSkip?: () => void;
    className?: string;
    children?: React.ReactNode;
}

export const OnboardingStep: React.FC<OnboardingStepProps> = ({
    step,
    totalSteps,
    title,
    description,
    onNext,
    onPrev,
    onSkip,
    className = '',
    children,
}) => {
    return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-8 max-w-2xl mx-auto ${className}`}>
            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Step {step} of {totalSteps}</span>
                    <span className="text-sm text-gray-500">{Math.round((step / totalSteps) * 100)}% complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">{title}</h2>
                <p className="text-gray-600">{description}</p>
            </div>

            {/* Custom Content */}
            {children && <div className="mb-8">{children}</div>}

            {/* Actions */}
            <div className="flex gap-3">
                {onPrev && step > 1 && (
                    <button
                        onClick={onPrev}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    >
                        Previous
                    </button>
                )}
                <button
                    onClick={onNext}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                    {step === totalSteps ? 'Get Started' : 'Continue'}
                </button>
            </div>

            {onSkip && step < totalSteps && (
                <button
                    onClick={onSkip}
                    className="w-full mt-4 text-sm text-gray-600 hover:text-gray-800"
                >
                    Skip for now
                </button>
            )}
        </div>
    );
};

export default OnboardingStep;
