// app/(auth)/register/page.tsx
import React from 'react';
import RegisterForm from '@/components/auth/RegisterForm';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';

export const metadata = {
  title: 'Sign Up - ProgressTracker',
  description: 'Create your account',
};

export default function RegisterPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Create your account
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Start tracking your coding progress today
        </p>
      </div>

      {/* Social Auth */}
      <SocialAuthButtons />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            Or sign up with email
          </span>
        </div>
      </div>

      {/* Register Form */}
      <RegisterForm />
    </div>
  );
}