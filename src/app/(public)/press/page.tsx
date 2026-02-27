"use client";

export default function PressPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold">Press & Media</h1>
          <p className="text-gray-600 mt-2">Resources for journalists and media professionals</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="bg-white border border-gray-200 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">About ProgressTracker</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            ProgressTracker is a comprehensive platform that helps developers track their coding progress
            across multiple platforms including LeetCode, GitHub, CodeForces, and more. Founded in 2024,
            we've grown to serve thousands of developers worldwide.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Our mission is to make progress tracking effortless and motivating, helping developers stay
            consistent and achieve their coding goals through data-driven insights and gamification.
          </p>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Key Statistics</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600">10K+</div>
              <div className="text-sm text-gray-600 mt-1">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">20+</div>
              <div className="text-sm text-gray-600 mt-1">Supported Platforms</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">1M+</div>
              <div className="text-sm text-gray-600 mt-1">Data Points Tracked</div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Press Kit</h2>
          <div className="space-y-3">
            <a href="#" className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Logo Package</div>
                  <div className="text-sm text-gray-600">PNG, SVG, and vector formats</div>
                </div>
                <span className="text-indigo-600">Download →</span>
              </div>
            </a>
            <a href="#" className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Brand Guidelines</div>
                  <div className="text-sm text-gray-600">Colors, typography, and usage rules</div>
                </div>
                <span className="text-indigo-600">Download →</span>
              </div>
            </a>
            <a href="#" className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Screenshots</div>
                  <div className="text-sm text-gray-600">High-resolution product images</div>
                </div>
                <span className="text-indigo-600">Download →</span>
              </div>
            </a>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Media Contact</h2>
          <p className="text-gray-700 mb-4">
            For press inquiries, interviews, or additional information:
          </p>
          <div className="space-y-2 text-gray-700">
            <div>
              <strong>Email:</strong>{' '}
              <a href="mailto:press@progresstracker.app" className="text-indigo-600 hover:underline">
                press@progresstracker.app
              </a>
            </div>
            <div><strong>Response Time:</strong> Within 24 hours</div>
          </div>
        </section>
      </main>
    </div>
  );
}
