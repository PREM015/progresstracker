"use client";

export default function InsightsPanel() {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
        💡 AI Insights
      </h3>
      <p className="text-blue-700 dark:text-blue-400">
        Keep up the great work! You&apos;ve solved 45 problems this month.
      </p>
    </div>
  );
}