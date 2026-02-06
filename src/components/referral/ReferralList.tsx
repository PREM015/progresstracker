'use client';

import React from 'react';

interface Referral {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'active';
  signedUpAt?: string;
}

interface ReferralListProps {
  referrals: Referral[];
  className?: string;
}

export const ReferralList: React.FC<ReferralListProps> = ({
  referrals,
  className = '',
}) => {
  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
    active: { label: 'Active', color: 'bg-indigo-100 text-indigo-700' },
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Your Referrals ({referrals.length})</h3>

      <div className="space-y-3">
        {referrals.map(referral => {
          const config = statusConfig[referral.status];
          return (
            <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{referral.email}</div>
                {referral.signedUpAt && (
                  <div className="text-sm text-gray-600 mt-1">
                    Signed up {new Date(referral.signedUpAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                {config.label}
              </span>
            </div>
          );
        })}

        {referrals.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No referrals yet. Share your link to get started!
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralList;
