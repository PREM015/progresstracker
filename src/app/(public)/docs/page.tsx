"use client";

import { useState, useEffect } from "react";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');

  const sections = [
    { id: 'introduction', title: 'Introduction', icon: '📖' },
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'platforms', title: 'Connecting Platforms', icon: '🔗' },
    { id: 'goals', title: 'Setting Goals', icon: '🎯' },
    { id: 'analytics', title: 'Analytics & Insights', icon: '📊' },
    { id: 'api', title: 'API Reference', icon: '⚙️' },
  ];

  const content: Record<string, any> = {
    introduction: {
      title: 'Welcome to ProgressTracker',
      content: `
        ProgressTracker is a comprehensive platform for tracking your coding progress across multiple platforms.
        Whether you're preparing for interviews, building projects, or just staying consistent with your coding practice,
        ProgressTracker helps you visualize your journey and stay motivated.
      `,
      subsections: [
        { title: 'Key Features', content: 'Multi-platform integration, goal tracking, analytics, achievements, and more.' },
        { title: 'Who is it for?', content: 'Students, professionals, competitive programmers, and anyone committed to improving their coding skills.' },
      ]
    },
    'getting-started': {
      title: 'Getting Started',
      content: 'Follow these steps to set up your ProgressTracker account and start tracking your progress.',
      subsections: [
        { title: '1. Create an Account', content: 'Sign up with email or use OAuth providers like Google or GitHub.' },
        { title: '2. Connect Platforms', content: 'Link your LeetCode, GitHub, CodeForces, and other accounts.' },
        { title: '3. Set Your First Goal', content: 'Define what you want to achieve and let us track your progress.' },
        { title: '4. Start Tracking', content: 'Your progress will automatically sync from connected platforms.' },
      ]
    },
    platforms: {
      title: 'Connecting Platforms',
      content: 'Learn how to connect and manage your coding platforms.',
      subsections: [
        { title: 'Supported Platforms', content: 'LeetCode, GitHub, CodeForces, HackerRank, Codeforces, TopCoder, and 20+ more.' },
        { title: 'OAuth vs API Key', content: 'Some platforms use OAuth (one-click), others require API keys from your account settings.' },
        { title: 'Auto-Sync', content: 'Enable auto-sync to automatically fetch your latest progress hourly or daily.' },
        { title: 'Manual Sync', content: 'You can manually trigger a sync anytime from the Sync page.' },
      ]
    },
    goals: {
      title: 'Setting and Tracking Goals',
      content: 'Goals help you stay focused and measure progress toward specific milestones.',
      subsections: [
        { title: 'Creating Goals', content: 'Set custom goals with targets, deadlines, and metrics.' },
        { title: 'Goal Templates', content: 'Use pre-made templates for common goals like "Solve 100 problems" or "Maintain 30-day streak".' },
        { title: 'Progress Tracking', content: 'Track progress automatically or log manually from the Tracker page.' },
        { title: 'Reminders', content: 'Get notified when deadlines approach or streaks are at risk.' },
      ]
    },
    analytics: {
      title: 'Analytics & Insights',
      content: 'Deep dive into your coding patterns with advanced analytics.',
      subsections: [
        { title: 'Heatmap', content: 'GitHub-style contribution graph showing your daily activity.' },
        { title: 'Trends', content: 'Track how metrics change over time with trend analysis.' },
        { title: 'Productivity Score', content: 'Get scored on consistency, efficiency, and goal progress.' },
        { title: 'AI Insights', content: 'Receive personalized recommendations to optimize your learning.' },
      ]
    },
    api: {
      title: 'API Reference',
      content: 'Integrate ProgressTracker into your own applications using our REST API.',
      subsections: [
        { title: 'Authentication', content: 'Use API keys from Settings > API to authenticate requests.' },
        { title: 'Rate Limits', content: 'Free tier: 100 requests/hour, Pro: 1000 requests/hour.' },
        { title: 'Endpoints', content: 'Full API documentation available at api.progresstracker.app/docs' },
      ]
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold">Documentation</h1>
          <p className="text-gray-600 mt-2">Everything you need to know about ProgressTracker</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          <nav className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-4">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${activeSection === section.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="font-medium">{section.title}</span>
                </button>
              ))}
            </div>
          </nav>

          <main className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <h2 className="text-3xl font-bold mb-4">{content[activeSection].title}</h2>
              <p className="text-gray-700 leading-relaxed mb-8">{content[activeSection].content}</p>

              <div className="space-y-6">
                {content[activeSection].subsections.map((subsection: any, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-bold mb-2">{subsection.title}</h3>
                    <p className="text-gray-700">{subsection.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
