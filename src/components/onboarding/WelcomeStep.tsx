'use client';

import React from 'react';

interface WelcomeStepProps {
  onNext: () => void;
  className?: string;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  onNext,
  className = '',
}) => {
  return (
    <div className={`bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-2xl p-12 text-center ${className}`}>
      <div className="text-8xl mb-6">👋</div>
      <h2 className="text-4xl font-bold mb-4">Welcome to Progress Tracker!</h2>
      <p className="text-xl opacity-90 mb-12 max-w-2xl mx-auto">
        Let's get your account set up in just a few simple steps
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white/20 backdrop-blur rounded-xl p-6">
          <div className="text-3xl mb-2">1️⃣</div>
          <div className="font-bold mb-2">Setup Profile</div>
          <div className="text-sm opacity-75">Tell us about yourself</div>
        </div>
        <div className="bg-white/20 backdrop-blur rounded-xl p-6">
          <div className="text-3xl mb-2">2️⃣</div>
          <div className="font-bold mb-2">Connect Platforms</div>
          <div className="text-sm opacity-75">Link your accounts</div>
        </div>
        <div className="bg-white/20 backdrop-blur rounded-xl p-6">
          <div className="text-3xl mb-2">3️⃣</div>
          <div className="font-bold mb-2">Set Goals</div>
          <div className="text-sm opacity-75">Define your objectives</div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="px-10 py-4 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 font-bold text-lg"
      >
        Let's Get Started →
      </button>
    </div>
  );
};

export default WelcomeStep;
