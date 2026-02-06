'use client';

import React from 'react';

interface CTASectionProps {
  className?: string;
}

export const CTASection: React.FC<CTASectionProps> = ({
  className = '',
}) => {
  return (
    <section className={`py-24 bg-gradient-to-r from-indigo-600 to-purple-600 text-white ${className}`}>
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-5xl font-bold mb-6">Ready to Track Your Progress?</h2>
        <p className="text-xl opacity-90 mb-12 max-w-2xl mx-auto">
          Join thousands of developers and students achieving their goals
        </p>

        <button className="px-10 py-4 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 font-bold text-lg">
          Start Free Today →
        </button>

        <div className="mt-8 text-sm opacity-75">
          No credit card required • Free forever • Cancel anytime
        </div>
      </div>
    </section>
  );
};

export default CTASection;
