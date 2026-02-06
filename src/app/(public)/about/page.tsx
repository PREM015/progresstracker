"use client";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-5xl font-bold mb-4">About ProgressTracker</h1>
          <p className="text-xl opacity-90">Track your coding journey, achieve your goals</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <section className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed text-lg">
            We believe that tracking progress is the key to achieving ambitious goals. ProgressTracker
            was built to help developers, students, and professionals monitor their growth across
            multiple platforms, stay motivated with streaks and achievements, and reach their full potential.
          </p>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-3xl font-bold mb-6">What We Offer</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 bg-indigo-50 rounded-lg">
              <div className="text-3xl mb-2">🔗</div>
              <h3 className="font-bold mb-2">Platform Integration</h3>
              <p className="text-sm text-gray-700">
                Connect LeetCode, GitHub, CodeForces, and more to see all your progress in one place
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-bold mb-2">Custom Goals</h3>
              <p className="text-sm text-gray-700">
                Set personalized goals with targets, deadlines, and automatic progress tracking
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-bold mb-2">Advanced Analytics</h3>
              <p className="text-sm text-gray-700">
                Visualize trends, productivity scores, and get AI-powered insights
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl mb-2">🏆</div>
              <h3 className="font-bold mb-2">Achievements</h3>
              <p className="text-sm text-gray-700">
                Unlock badges and milestones as you reach your coding goals
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-3xl font-bold mb-4">Our Story</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            ProgressTracker was founded in 2024 by a team of developers who struggled to keep track
            of their progress across different coding platforms. We wanted a single dashboard that
            could show our LeetCode streak, GitHub contributions, and CodeForces rating all in one place.
          </p>
          <p className="text-gray-700 leading-relaxed">
            What started as a simple tracking tool has evolved into a comprehensive platform used by
            thousands of developers worldwide to stay motivated and achieve their coding goals.
          </p>
        </section>

        <section className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Join thousands of developers tracking their progress</h2>
          <a
            href="/register"
            className="inline-block px-8 py-3 bg-indigo-600 text-white text-lg font-medium rounded-lg hover:bg-indigo-700"
          >
            Get Started Free
          </a>
        </section>
      </main>
    </div>
  );
}
