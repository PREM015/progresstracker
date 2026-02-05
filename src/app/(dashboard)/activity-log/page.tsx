import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

async function getActivityLog() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/activity`, {
      cache: 'no-store'
    });
    return response.json();
  } catch (error) {
    console.error('Error fetching activity log:', error);
    return null;
  }
}

export default async function ActivityLogPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  const activities = await getActivityLog();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Activity Log
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your recent account activity and actions
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-wrap gap-4">
          <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option>All Activities</option>
            <option>Account</option>
            <option>Platform Sync</option>
            <option>Goals</option>
            <option>Settings</option>
            <option>Security</option>
          </select>

          <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 3 months</option>
            <option>All time</option>
          </select>

          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Export Log
          </button>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="space-y-8">
          {/* Today */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Today
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-900 dark:text-white font-medium">
                      Platform synced successfully
                    </p>
                    <span className="text-sm text-gray-500 dark:text-gray-400">2:34 PM</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    LeetCode platform synced - 5 new problems detected
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-900 dark:text-white font-medium">
                      Profile updated
                    </p>
                    <span className="text-sm text-gray-500 dark:text-gray-400">11:20 AM</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Bio and location information updated
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-900 dark:text-white font-medium">
                      New goal created
                    </p>
                    <span className="text-sm text-gray-500 dark:text-gray-400">9:45 AM</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Created goal: "Solve 100 problems this month"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Yesterday */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Yesterday
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-900 dark:text-white font-medium">
                      Login from new device
                    </p>
                    <span className="text-sm text-gray-500 dark:text-gray-400">8:30 PM</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Chrome on Windows - IP: 192.168.1.1
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-900 dark:text-white font-medium">
                      Password changed
                    </p>
                    <span className="text-sm text-gray-500 dark:text-gray-400">3:15 PM</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Password successfully updated
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Load More */}
          <div className="text-center pt-4">
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
              Load more activities
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
