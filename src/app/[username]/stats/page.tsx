import { notFound } from "next/navigation";

interface PageProps {
  params: {
    username: string;
  };
}

async function getUserStats(username: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/${username}/stats`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return null;
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

export default async function UserStatsPage({ params }: PageProps) {
  const stats = await getUserStats(params.username);

  if (!stats) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {stats.user.name || params.username}'s Statistics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive progress tracking across all platforms
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Problems</span>
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalProblems.toLocaleString()}</p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              +{stats.problemsThisWeek} this week
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Commits</span>
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCommits.toLocaleString()}</p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              +{stats.commitsThisWeek} this week
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Streak</span>
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.currentStreak}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Best: {stats.longestStreak} days
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Global Rank</span>
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">#{stats.rank || 'N/A'}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Top {stats.percentile}%
            </p>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Platform Performance</h2>
          <div className="space-y-4">
            {stats.platforms.map((platform: any) => (
              <div key={platform.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {platform.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{platform.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{platform.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{platform.stats.total}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{platform.stats.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Activity Heatmap</h2>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 h-48 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Activity heatmap visualization</p>
          </div>
        </div>
      </div>
    </div>
  );
}
