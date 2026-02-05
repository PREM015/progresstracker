// components/auth/RegisterForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { registerSchema, type RegisterInput } from '@/lib/validators';
import apiClient from '@/lib/apiClient';

export default function RegisterForm() {
  const router = useRouter();
  
  const [formData, setFormData] = useState<RegisterInput & { acceptTerms: boolean }>({
    name: '',
    email: '',
    password: '',
    acceptTerms: false,
  });
  
  const [errors, setErrors] = useState<Partial<RegisterInput & { acceptTerms: string }>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Clear error
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    setServerError('');

    // Calculate password strength
    if (name === 'password') {
      let strength = 0;
      if (value.length >= 8) strength++;
      if (/[a-z]/.test(value)) strength++;
      if (/[A-Z]/.test(value)) strength++;
      if (/[0-9]/.test(value)) strength++;
      if (/[^a-zA-Z0-9]/.test(value)) strength++;
      setPasswordStrength(strength);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    // Validate terms
    if (!formData.acceptTerms) {
      setErrors({ acceptTerms: 'You must accept the terms and conditions' });
      return;
    }

    // Validate form
    const validation = registerSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<RegisterInput> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof RegisterInput] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      // Create user account
      const response = await apiClient.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (response.error) {
        setServerError(response.error);
        setLoading(false);
      } else {
        // ✅ Auto-login with NextAuth after successful registration
        const result = await signIn('credentials', {
          redirect: false,
          email: formData.email,
          password: formData.password,
        });

        if (result?.error) {
          // Registration succeeded but login failed - redirect to login
          router.push('/login?message=Account created. Please log in.');
        } else if (result?.ok) {
          // Both registration and login succeeded
          router.push('/dashboard');
          router.refresh();
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setServerError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Server Error */}
      {serverError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{serverError}</p>
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          value={formData.name}
          onChange={handleChange}
          className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all outline-none ${
            errors.name
              ? 'border-red-500 dark:border-red-400'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="John Doe"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all outline-none ${
            errors.email
              ? 'border-red-500 dark:border-red-400'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all outline-none pr-12 ${
              errors.password
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Password Strength Indicator */}
        {formData.password && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4, 5].map(level => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    level <= passwordStrength ? getPasswordStrengthColor() : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Strength: <span className="font-medium">{getPasswordStrengthLabel()}</span>
            </p>
          </div>
        )}
        
        {errors.password && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
        )}
      </div>

      {/* Terms & Conditions */}
      <div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleChange}
            className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            I agree to the{' '}
            <a href="/terms" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
              Privacy Policy
            </a>
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.acceptTerms}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-blue-500/30"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating account...
          </span>
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  );
}