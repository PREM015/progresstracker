'use client';

import React from 'react';

interface ReferralStatsProps {
  stats: {
    totalReferrals: number;
    accepted: number;
    pending: number;
    rewards: number;
  };
  className?: string;
}

export const ReferralStats: React.FC<ReferralStatsProps> = ({
  stats,
  className = '',
}) => {
  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Referral Statistics</h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-indigo-50 rounded-xl p-6 text-center">
          <div className="text-4xl font-bold text-indigo-600 mb-2">{stats.totalReferrals}</div>
          <div className="text-sm text-gray-600">Total Referrals</div>
        </div>

        <div className="bg-green-50 rounded-xl p-6 text-center">
          <div className="text-4xl font-bold text-green-600 mb-2">{stats.accepted}</div>
          <div className="text-sm text-gray-600">Accepted</div>
        </div>

        <div className="bg-yellow-50 rounded-xl p-6 text-center">
          <div className="text-4xl font-bold text-yellow-600 mb-2">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>

        <div className="bg-purple-50 rounded-xl p-6 text-center">
          <div className="text-4xl font-bold text-purple-600 mb-2">${stats.rewards}</div>
          <div className="text-sm text-gray-600">Rewards Earned</div>
        </div>
      </div>
    </div>
  );
};

export default ReferralStats;
