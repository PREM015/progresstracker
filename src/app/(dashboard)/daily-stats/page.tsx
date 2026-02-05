import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

async function getDailyStats() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats`, {
      cache: 'no-store'
    });
    return response.json();
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return null;
  }
}

export default async function DailyStatsPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  const stats = await getDailyStats();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Daily Statistics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your daily progress across all platforms
        </p>
      </div>

      {/* Date Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
          </div>

          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <p className="text-blue-100 text-sm mb-2">Problems Solved</p>
          <p className="text-3xl font-bold">{stats?.today?.problemsSolved || 0}</p>
          <p className="text-blue-100 text-xs mt-2">Target: 5/day</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <p className="text-green-100 text-sm mb-2">Commits</p>
          <p className="text-3xl font-bold">{stats?.today?.commits || 0}</p>
          <p className="text-green-100 text-xs mt-2">+12% from yesterday</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <p className="text-purple-100 text-sm mb-2">Pull Requests</p>
          <p className="text-3xl font-bold">{stats?.today?.pullRequests || 0}</p>
          <p className="text-purple-100 text-xs mt-2">2 merged</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <p className="text-orange-100 text-sm mb-2">Time Spent</p>
          <p className="text-3xl font-bold">{stats?.today?.timeSpent || 0}h</p>
          <p className="text-orange-100 text-xs mt-2">Most productive</p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-6 text-white">
          <p className="text-pink-100 text-sm mb-2">Total Points</p>
          <p className="text-3xl font-bold">{stats?.today?.totalPoints || 0}</p>
          <p className="text-pink-100 text-xs mt-2">Daily best!</p>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Platform Activity Today
        </h2>
        <div className="space-y-4">
          {stats?.platforms?.map((platform: any) => (
            <div key={platform.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-12 rounded-full ${platform.hasActivity ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{platform.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Last sync: {platform.lastSync}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900 dark:text-white">{platform.activity}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">activities</p>
              </div>
            </div>
          )) || (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No platform activity recorded today
            </p>
          )}
        </div>
      </div>

      {/* Weekly Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          This Week vs Last Week
        </h2>
        <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chart visualization here</p>
        </div>
      </div>
    </div>
  );
}
