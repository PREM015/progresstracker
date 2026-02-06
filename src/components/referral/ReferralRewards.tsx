'use client';

import React from 'react';

interface Reward {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
}

interface ReferralRewardsProps {
  rewards: Reward[];
  className?: string;
}

export const ReferralRewards: React.FC<ReferralRewardsProps> = ({
  rewards,
  className = '',
}) => {
  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Referral Rewards</h3>

      <div className="space-y-3">
        {rewards.map(reward => (
          <div
            key={reward.id}
            className={`flex items-center gap-4 p-4 border-2 rounded-xl ${reward.unlocked ? 'border-green-400 bg-green-50' : 'border-gray-200'
              }`}
          >
            <div className={`text-4xl ${!reward.unlocked && 'grayscale opacity-50'}`}>
              {reward.icon}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{reward.title}</div>
              <div className="text-sm text-gray-600">{reward.description}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-indigo-600">{reward.points} pts</div>
              {reward.unlocked && <div className="text-xs text-green-600">Unlocked</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReferralRewards;
