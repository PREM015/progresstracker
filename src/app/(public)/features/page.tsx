"use client";

export default function FeaturesPage() {
  const features = [
    {
      icon: '🔗',
      title: 'Multi-Platform Integration',
      description: 'Connect LeetCode, GitHub, CodeForces, HackerRank, and 20+ more platforms',
      benefits: ['Auto-sync progress', 'Unified dashboard', 'Real-time updates']
    },
    {
      icon: '🎯',
      title: 'Smart Goal Tracking',
      description: 'Set and achieve your coding goals with intelligent progress monitoring',
      benefits: ['Custom metrics', 'Deadline reminders', 'Progress visualization']
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description: 'Deep insights into your coding patterns and productivity',
      benefits: ['Heatmap visualization', 'Trend analysis', 'Productivity scores']
    },
    {
      icon: '🏆',
      title: 'Achievements & Gamification',
      description: 'Stay motivated with badges, streaks, and milestone rewards',
      benefits: ['100+ achievements', 'Streak tracking', 'Leaderboards']
    },
    {
      icon: '🤖',
      title: 'AI-Powered Insights',
      description: 'Get personalized recommendations to optimize your learning',
      benefits: ['Smart suggestions', 'Pattern detection', 'Actionable tips']
    },
    {
      icon: '🔔',
      title: 'Smart Notifications',
      description: 'Stay on track with customizable alerts and reminders',
      benefits: ['Goal reminders', 'Streak alerts', 'Platform updates']
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-5xl font-bold mb-4">Powerful Features</h1>
          <p className="text-xl opacity-90">Everything you need to track and achieve your coding goals</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-lg transition">
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-600 mb-4">{feature.description}</p>
              <ul className="space-y-2">
                {feature.benefits.map((benefit, bidx) => (
                  <li key={bidx} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start tracking?</h2>
          <p className="text-gray-600 mb-6 text-lg">Join thousands of developers achieving their goals</p>
          <a
            href="/register"
            className="inline-block px-8 py-4 bg-indigo-600 text-white text-lg font-medium rounded-lg hover:bg-indigo-700"
          >
            Get Started Free →
          </a>
        </div>
      </main>
    </div>
  );
}
