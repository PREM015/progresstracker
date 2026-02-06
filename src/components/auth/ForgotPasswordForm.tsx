'use client';

import React, { useState } from 'react';

interface ForgotPasswordFormProps {
  onSuccess: () => void;
  onBackToLogin?: () => void;
  className?: string;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onBackToLogin,
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Request failed');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`bg-white border border-gray-200 rounded-2xl p-8 max-w-md mx-auto ${className}`}>
      <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Reset Password</h2>
      <p className="text-gray-600 mb-8 text-center">
        Enter your email and we'll send you a link to reset your password
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </div>

      {onBackToLogin && (
        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full mt-4 text-sm text-gray-600 hover:text-gray-800"
        >
          ← Back to login
        </button>
      )}
    </form>
  );
};

export default ForgotPasswordForm;