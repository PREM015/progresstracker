'use client';

import React, { useState } from 'react';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQProps {
  className?: string;
}

export const FAQ: React.FC<FAQProps> = ({
  className = '',
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQ[] = [
    { question: 'Is it really free?', answer: 'Yes! Our free plan is free forever with no credit card required.' },
    { question: 'Which platforms do you support?', answer: 'We support LeetCode, GitHub, HackerRank, Codeforces, and many more!' },
    { question: 'Can I cancel anytime?', answer: 'Absolutely! Cancel your subscription at any time with one click.' },
    { question: 'Do you offer refunds?', answer: 'Yes, we offer a 30-day money-back guarantee on all paid plans.' },
  ];

  return (
    <section className={`py-20 bg-gray-50 ${className}`}>
      <div className="container mx-auto px-6 max-w-3xl">
        <h2 className="text-4xl font-bold text-center mb-16">Frequently Asked Questions</h2>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full px-6 py-4 text-left font-semibold flex items-center justify-between hover:bg-gray-50"
              >
                {faq.question}
                <span className="text-2xl">{openIndex === idx ? '−' : '+'}</span>
              </button>
              {openIndex === idx && (
                <div className="px-6 py-4 border-t bg-gray-50 text-gray-700">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
