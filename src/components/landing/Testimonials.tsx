'use client';

import React from 'react';

interface TestimonialsProps {
  className?: string;
}

export const Testimonials: React.FC<TestimonialsProps> = ({
  className = '',
}) => {
  const testimonials = [
    { name: 'Alex Chen', role: 'Software Engineer', text: 'This platform helped me track my progress and land my dream job!', avatar: '👨‍💻' },
    { name: 'Sarah Miller', role: 'Student', text: 'Love the analytics! Seeing my growth motivates me every day.', avatar: '👩‍🎓' },
    { name: 'James  Wilson', role: 'Developer', text: 'The best tool for monitoring my coding journey across platforms.', avatar: '👨‍💼' },
  ];

  return (
    <section className={`py-20 bg-indigo-50 ${className}`}>
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-16">What Users Say</h2>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <div key={idx} className="bg-white rounded-xl p-8">
              <div className="text-5xl mb-4">{t.avatar}</div>
              <p className="text-gray-700 mb-6 italic">"{t.text}"</p>
              <div className="font-bold">{t.name}</div>
              <div className="text-sm text-gray-600">{t.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
