'use client';

import React, { useState } from 'react';

interface ReferralDashboardProps {
  className?: string;
}

export const ReferralDashboard: React.FC<ReferralDashboardProps> = ({
  className = '',
}) => {
  const [stats] = useState({ totalReferrals: 24, accepted: 18, rewards: 450 });

  return (
    <div className={`bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl p-8 ${className}`}>
      <h3 className="text-2xl font-bold mb-6">Referral Dashboard</h3>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white/20 backdrop-blur rounded-xl p-6 text-center">
          <div className="text-4xl font-bold">{stats.totalReferrals}</div>
          <div className="text-sm opacity-90">Total Referrals</div>
        </div>
        <div className="bg-white/20 backdrop-blur rounded-xl p-6 text-center">
          <div className="text-4xl font-bold">{stats.accepted}</div>
          <div className="text-sm opacity-90">Accepted</div>
        </div>
        <div className="bg-white/20 backdrop-blur rounded-xl p-6 text-center">
          <div className="text-4xl font-bold">${stats.rewards}</div>
          <div className="text-sm opacity-90">Rewards Earned</div>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur rounded-xl p-6">
        <div className="text-sm mb-3">Your Referral Link</div>
        <div className="flex gap-3">
          <input
            type="text"
            value="https://progresstracker.app/ref/ABC123"
            readOnly
            className="flex-1 px-4 py-2 bg-white/20 rounded-lg"
          />
          <button className="px-6 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 font-bold">
            Copy
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;
