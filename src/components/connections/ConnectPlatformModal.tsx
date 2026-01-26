'use client';

import { useState } from 'react';
import { X, Loader } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface ConnectPlatformModalProps {
  platform: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    description?: string;
  };
  onConnect: (platformId: string, username?: string, token?: string) => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
}

export function ConnectPlatformModal({
  platform,
  onConnect,
  onClose,
  isOpen,
}: ConnectPlatformModalProps) {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onConnect(platform.id, username || undefined, token || undefined);
      setUsername('');
      setToken('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to connect platform');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {platform.icon && (
              <span className="text-3xl">{platform.icon}</span>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Connect {platform.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {platform.description || `Enter your ${platform.name} details`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Username/Email Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Username or Email
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={`Enter your ${platform.name} username`}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              required
            />
          </div>

          {/* Optional Token */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              API Token (Optional)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter API token if needed"
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Only required if platform doesn't support public profiles
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Help Text */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-gray-600 dark:text-gray-300 border border-blue-200 dark:border-blue-800">
            <p className="font-semibold mb-1">💡 How to find your username:</p>
            <p className="text-xs">Visit your {platform.name} profile page. Your username is typically in the URL or at the top of your profile.</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !username}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                `Connect ${platform.name}`
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
