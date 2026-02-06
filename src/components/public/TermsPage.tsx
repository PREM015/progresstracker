'use client';

import React from 'react';

interface TermsPageProps {
  className?: string;
}

export const TermsPage: React.FC<TermsPageProps> = ({
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-white py-12 ${className}`}>
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last updated: January 2024</p>

        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 mb-4">
            By using Progress Tracker, you agree to these terms. If you disagree, do not use our service.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. User Accounts</h2>
          <p className="text-gray-700 mb-4">
            You are responsible for maintaining the security of your account and password.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. Acceptable Use</h2>
          <p className="text-gray-700 mb-4">
            You may not use our service for illegal purposes or to violate any laws.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. Service Availability</h2>
          <p className="text-gray-700 mb-4">
            We strive for 99.9% uptime but do not guarantee uninterrupted access.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">5. Termination</h2>
          <p className="text-gray-700 mb-4">
            We reserve the right to terminate accounts that violate these terms.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">6. Contact</h2>
          <p className="text-gray-700">
            Questions? Contact legal@progresstracker.app
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
