'use client';

import { useState } from 'react';
import { X, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectPlatformModalProps {
  platform: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    color?: string;
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
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onConnect(platform.id, username || undefined, token || undefined);
      setSuccess(true);
      setTimeout(() => {
        setUsername('');
        setToken('');
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to connect platform');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Header with gradient */}
                <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {platform.icon && (
                        <div className="text-4xl bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                          {platform.icon}
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          Connect {platform.name}
                        </h2>
                        <p className="text-sm text-white/80 mt-1">
                          {platform.description || `Enter your ${platform.name} credentials`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      disabled={isLoading}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Success state */}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
                    >
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-semibold text-green-900 dark:text-green-100">
                          ✓ Connected successfully!
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-200">
                          Syncing your data now...
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Error state */}
                  {error && !success && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                    >
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900 dark:text-red-100">
                          Connection failed
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-200">
                          {error}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Username Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Username or Email
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={`e.g., john_doe or john@example.com`}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
                      required
                    />
                  </div>

                  {/* Optional Token */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      API Token <span className="text-gray-500 font-normal">(optional)</span>
                    </label>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Enter API token if required"
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
                    />
                  </div>

                  {/* Help text */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-900 dark:text-blue-200">
                      💡 <strong>We only fetch public data</strong> using your username. Your account stays secure.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !username || success}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : success ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Connected!
                        </>
                      ) : (
                        'Connect Platform'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
