'use client';

import React from 'react';

interface PrivacyPageProps {
  className?: string;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-white py-12 ${className}`}>
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: January 2024</p>

        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>
          <p className="text-gray-700 mb-4">
            We collect information you provide directly, including your name, email, and usage data.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Your Data</h2>
          <p className="text-gray-700 mb-4">
            Your data is used to provide and improve our services, send notifications, and analyze usage patterns.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. Data Sharing</h2>
          <p className="text-gray-700 mb-4">
            We do not sell your personal data. We may share data with service providers as necessary.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. Your Rights</h2>
          <p className="text-gray-700 mb-4">
            You have the right to access, correct, or delete your personal data at any time.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">5. Contact Us</h2>
          <p className="text-gray-700">
            If you have questions, contact us at privacy@progresstracker.app
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
