"use client";

import { useState, useEffect } from "react";

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "How do I create an account?",
          a: "Click the 'Sign Up' button on the homepage and follow the registration process. You can sign up with email or use OAuth providers like Google or GitHub."
        },
        {
          q: "Which platforms can I connect?",
          a: "We support LeetCode, GitHub, CodeForces, HackerRank, and many more. Check the Platforms page for the full list of supported integrations."
        },
        {
          q: "Is ProgressTracker free?",
          a: "Yes! We offer a free tier with core features. Premium plans unlock advanced analytics, unlimited platforms, and priority support."
        },
      ]
    },
    {
      category: "Features",
      questions: [
        {
          q: "How does auto-sync work?",
          a: "Auto-sync automatically fetches your latest progress from connected platforms at regular intervals (configurable in settings). No manual updates needed!"
        },
        {
          q: "Can I set custom goals?",
          a: "Absolutely! Create custom goals with your own metrics, targets, and deadlines. You can also use our pre-made goal templates."
        },
        {
          q: "What are achievements?",
          a: "Achievements are milestones you unlock by completing goals, maintaining streaks, and reaching progress thresholds. Collect them all!"
        },
      ]
    },
    {
      category: "Privacy & Security",
      questions: [
        {
          q: "Is my data secure?",
          a: "Yes! All data is encrypted in transit and at rest. We use industry-standard security practices and never share your data without consent."
        },
        {
          q: "Can I delete my account?",
          a: "Yes, you can delete your account anytime from Settings > Account > Delete Account. All your data will be permanently removed."
        },
        {
          q: "Do you sell my data?",
          a: "Never! We respect your privacy and will never sell your personal information to third parties."
        },
      ]
    },
    {
      category: "Billing & Subscription",
      questions: [
        {
          q: "What payment methods do you accept?",
          a: "We accept all major credit cards, PayPal, and Google Pay through our secure payment processor Stripe."
        },
        {
          q: "Can I cancel my subscription?",
          a: "Yes, you can cancel anytime from Settings > Billing. You'll retain access until the end of your billing period."
        },
        {
          q: "Do you offer refunds?",
          a: "We offer a 14-day money-back guarantee. If you're not satisfied, contact support for a full refund."
        },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold">Frequently Asked Questions</h1>
          <p className="text-gray-600 mt-2">Find answers to common questions</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {faqs.map((category, catIdx) => (
            <div key={catIdx}>
              <h2 className="text-2xl font-bold mb-4">{category.category}</h2>
              <div className="space-y-3">
                {category.questions.map((faq, qIdx) => {
                  const globalIdx = catIdx * 100 + qIdx;
                  const isOpen = openIndex === globalIdx;

                  return (
                    <div key={qIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : globalIdx)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition"
                      >
                        <span className="font-medium text-gray-900">{faq.q}</span>
                        <span className="text-2xl text-gray-400">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-4 text-gray-700">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
          <p className="text-gray-600 mb-4">Our support team is here to help</p>
          <a
            href="/contact"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Contact Support
          </a>
        </div>
      </main>
    </div>
  );
}
