'use client';

import React, { useState } from 'react';

interface ProfileSetupStepProps {
  onNext: (data: any) => void;
  className?: string;
}

export const ProfileSetupStep: React.FC<ProfileSetupStepProps> = ({
  onNext,
  className = '',
}) => {
  const [formData, setFormData] = useState({ name: '', bio: '', avatar: '' });

  return (
    <div className={`bg-white rounded-2xl p-8 ${className}`}>
      <h2 className="text-3xl font-bold mb-2">Setup Your Profile</h2>
      <p className="text-gray-600 mb-8">Let's personalize your account</p>

      <div className="space-y-6">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl">
            {formData.name.charAt(0) || '👤'}
          </div>
        </div>

        <div>
          <label className="block font-medium mb-2">Full Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
            className="w-full px-4 py-3 border rounded-lg"
          />
        </div>

        <div>
          <label className="block font-medium mb-2">Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            rows={4}
            className="w-full px-4 py-3 border rounded-lg"
          />
        </div>

        <button
          onClick={() => onNext(formData)}
          disabled={!formData.name}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ProfileSetupStep;
