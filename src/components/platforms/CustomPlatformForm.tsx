'use client';

import React, { useState } from 'react';

interface CustomPlatformFormProps {
  onSubmit: (data: CustomPlatform Data) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

interface CustomPlatformData {
  name: string;
  baseUrl: string;
  apiEndpoint: string;
  authType: 'api_key' | 'oauth' | 'username_password';
  icon?: string;
  color?: string;
}

export const CustomPlatformForm: React.FC<CustomPlatformFormProps> = ({
  onSubmit,
  onCancel,
  className = '',
}) => {
  const [formData, setFormData] = useState<CustomPlatformData>({
    name: '',
    baseUrl: '',
    apiEndpoint: '',
    authType: 'api_key',
    icon: '🔗',
    color: '#6366f1',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Add Custom Platform</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="My Custom Platform"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
          <input
            type="url"
            value={formData.baseUrl}
            onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="https://api.example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">API Endpoint</label>
          <input
            type="text"
            value={formData.apiEndpoint}
            onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="/api/v1/stats"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Authentication Type</label>
          <select
            value={formData.authType}
            onChange={(e) => setFormData({ ...formData, authType: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="api_key">API Key</option>
            <option value="oauth">OAuth</option>
            <option value="username_password">Username/Password</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon (Emoji)</label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-2xl"
              placeholder="🔗"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Platform'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CustomPlatformForm;
