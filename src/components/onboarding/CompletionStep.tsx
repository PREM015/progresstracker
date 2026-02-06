'use client';

import React from 'react';

interface CompletionStepProps {
  userName: string;
  className?: string;
}

export const CompletionStep: React.FC<CompletionStepProps> = ({
  userName,
  className = '',
}) => {
  return (
    <div className={`bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-2xl p-12 text-center ${className}`}>
      <div className="text-8xl mb-6">🎉</div>
      <h2 className="text-4xl font-bold mb-4">You're All Set, {userName}!</h2>
      <p className="text-lg opacity-90 mb-8">
        Your progress tracking journey starts now
      </p>

      <div className="bg-white/20 backdrop-blur rounded-xl p-6 mb-8">
        <h3 className="font-bold mb-4">What's Next?</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm">Add your first entry</div>
          </div>
          <div>
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-sm">Set your first goal</div>
          </div>
          <div>
            <div className="text-3xl mb-2">🔗</div>
            <div className="text-sm">Connect platforms</div>
          </div>
        </div>
      </div>

      <button className="px-8 py-4 bg-white text-green-600 rounded-lg hover:bg-gray-100 font-bold text-lg">
        Go to Dashboard
      </button>
    </div>
  );
};

export default CompletionStep;
