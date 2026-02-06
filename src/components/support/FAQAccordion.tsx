'use client';

import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  className?: string;
}

const FAQ_DATA: FAQItem[] = [
  { question: 'How do I connect a platform?', answer: 'Go to Settings > Connected Platforms and click "Add Platform".' },
  { question: 'How often does data sync?', answer: 'Data syncs automatically every hour. You can also trigger manual sync anytime.' },
  { question: 'Can I export my data?', answer: 'Yes! Go to Settings > Export Data to download in CSV, JSON, or PDF format.' },
  { question: 'How do goals work?', answer: 'Set targets for your activities. Track progress and earn achievements when you complete them.' },
];

export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  className = '',
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>

      <div className="space-y-3">
        {FAQ_DATA.map((item, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full px-6 py-4 text-left font-semibold text-gray-900 hover:bg-gray-50 flex items-center justify-between"
            >
              {item.question}
              <span className="text-xl">{openIndex === idx ? '−' : '+'}</span>
            </button>
            {openIndex === idx && (
              <div className="px-6 py-4 bg-gray-50 text-gray-700 border-t">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQAccordion;
