"use client";

import { useState, useEffect } from "react";

export default function CareersPage() {
  const openings = [
    {
      title: 'Senior Full-Stack Engineer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      description: 'Build the next generation of progress tracking tools with React, Node.js, and PostgreSQL.'
    },
    {
      title: 'Product Designer',
      department: 'Design',
      location: 'Remote',
      type: 'Full-time',
      description: 'Design beautiful, intuitive experiences for developers tracking their progress.'
    },
    {
      title: 'Developer Advocate',
      department: 'Marketing',
      location: 'Remote',
      type: 'Full-time',
      description: 'Help developers get the most out of ProgressTracker through content, demos, and community engagement.'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-5xl font-bold mb-4">Join Our Team</h1>
          <p className="text-xl opacity-90">Help millions of developers achieve their goals</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Why ProgressTracker?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-3xl mb-3">🚀</div>
              <h3 className="font-bold mb-2">Fast Growth</h3>
              <p className="text-sm text-gray-600">Join a rapidly growing startup making a real impact</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-3xl mb-3">🌍</div>
              <h3 className="font-bold mb-2">Remote First</h3>
              <p className="text-sm text-gray-600">Work from anywhere in the world</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-3xl mb-3">💡</div>
              <h3 className="font-bold mb-2">Impact</h3>
              <p className="text-sm text-gray-600">Build products that developers love</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-6">Open Positions</h2>
          {openings.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <span className="text-5xl">💼</span>
              <p className="mt-4 text-gray-500">No open positions at the moment</p>
              <p className="text-sm text-gray-400 mt-2">Check back soon or send us your resume at careers@progresstracker.app</p>
            </div>
          ) : (
            <div className="space-y-4">
              {openings.map((job, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                        <span>{job.department}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                        <span>•</span>
                        <span>{job.type}</span>
                      </div>
                    </div>
                    <a
                      href={`mailto:careers@progresstracker.app?subject=Application for ${job.title}`}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                    >
                      Apply
                    </a>
                  </div>
                  <p className="text-gray-700">{job.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
