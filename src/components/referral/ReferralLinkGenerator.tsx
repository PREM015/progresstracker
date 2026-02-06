'use client';

import React, { useState } from 'react';

interface ReferralLinkGeneratorProps {
    userId: string;
    className?: string;
}

export const ReferralLinkGenerator: React.FC<ReferralLinkGeneratorProps> = ({
    userId,
    className = '',
}) => {
    const [referralCode, setReferralCode] = useState('');
    const [copied, setCopied] = useState(false);

    React.useEffect(() => {
        fetch('/api/referral/code')
            .then(r => r.json())
            .then(data => setReferralCode(data.code));
    }, [userId]);

    const referralLink = `${window.location.origin}?ref=${referralCode}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-8 ${className}`}>
            <h3 className="text-2xl font-bold mb-2">Refer Friends & Earn Rewards</h3>
            <p className="opacity-90 mb-6">Share your unique referral link and get rewards when friends sign up!</p>

            <div className="bg-white/20 backdrop-blur-lg rounded-lg p-4 mb-4">
                <label className="block text-sm font-medium mb-2 opacity-90">Your Referral Link</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={referralLink}
                        readOnly
                        className="flex-1 px-4 py-2 bg-white/30 border border-white/40 rounded-lg text-white placeholder-white/60"
                    />
                    <button
                        onClick={handleCopy}
                        className="px-6 py-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                    >
                        {copied ? '✓ Copied!' : 'Copy'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold mb-1">🎁</div>
                    <div className="text-sm opacity-90">Both Get Bonus</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold mb-1">♾️</div>
                    <div className="text-sm opacity-90">Unlimited Referrals</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold mb-1">⚡</div>
                    <div className="text-sm opacity-90">Instant Rewards</div>
                </div>
            </div>
        </div>
    );
};

export default ReferralLinkGenerator;
