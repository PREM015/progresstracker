'use client';

import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface FAQProps {
  className?: string;
}

export const FAQ: React.FC<FAQProps> = ({
  className = '',
}) => {
  const faqs = [
    { question: 'Is it really free?', answer: 'Yes! Our free plan includes all essential features forever with no credit card required. You can upgrade to Pro for advanced analytics and higher limits.' },
    { question: 'Which platforms do you support?', answer: 'We currently support LeetCode, GitHub, HackerRank, Codeforces, AtCoder, and are constantly adding more. You can also request specific platforms via our community.' },
    { question: 'Can I cancel anytime?', answer: 'Absolutely! You can cancel your subscription at any time from your account settings. You will retain access until the end of your billing cycle.' },
    { question: 'Do you offer refunds?', answer: 'Yes, we offer a 30-day money-back guarantee on all paid plans. If you are not satisfied, simply contact support for a full refund.' },
    { question: 'Is my data secure?', answer: 'Security is our top priority. We use industry-standard encryption and never sell your data to third parties. Your tracking data is private to you by default.' },
  ];

  return (
    <section className={`py-24 bg-secondary/30 ${className}`}>
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-muted-foreground">Have questions? We're here to help.</p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-xl bg-background px-6">
              <AccordionTrigger className="text-left font-medium text-lg py-6 hover:no-underline">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
