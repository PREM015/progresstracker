import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

async function getIntegrations() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/platforms/connected`, {
      cache: 'no-store'
    });
    return response.json();
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return null;
  }
}

export default async function IntegrationsPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  const integrations = await getIntegrations();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Integrations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage all your platform connections in one place
          </p>
        </div>
        <Link
          href="/platforms/connect"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Add Integration
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Integrations</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {integrations?.total || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Active</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {integrations?.active || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Need Attention</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {integrations?.needAttention || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Last Sync</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            2h ago
          </p>
        </div>
      </div>

      {/* Integration Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Development Platforms */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Development
            </h2>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">
              {integrations?.categories?.development || 0} connected
            </span>
          </div>
          <div className="space-y-3">
            {integrations?.platforms?.filter((p: any) => p.category === 'GIT').map((platform: any) => (
              <div key={platform.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${platform.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="font-medium text-gray-900 dark:text-white">{platform.name}</span>
                </div>
                <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Settings
                </button>
              </div>
            ))}
            <Link href="/platforms/connect" className="block text-center py-2 text-blue-600 dark:text-blue-400 text-sm hover:underline">
              + Add more
            </Link>
          </div>
        </div>

        {/* Learning Platforms */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Learning
            </h2>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm">
              {integrations?.categories?.learning || 0} connected
            </span>
          </div>
          <div className="space-y-3">
            {integrations?.platforms?.filter((p: any) => p.category === 'LEARNING').map((platform: any) => (
              <div key={platform.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${platform.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="font-medium text-gray-900 dark:text-white">{platform.name}</span>
                </div>
                <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Settings
                </button>
              </div>
            ))}
            <Link href="/platforms/connect" className="block text-center py-2 text-blue-600 dark:text-blue-400 text-sm hover:underline">
              + Add more
            </Link>
          </div>
        </div>

        {/* DSA Platforms */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              DSA & Competitive
            </h2>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm">
              {integrations?.categories?.dsa || 0} connected
            </span>
          </div>
          <div className="space-y-3">
            {integrations?.platforms?.filter((p: any) => p.category === 'DSA').map((platform: any) => (
              <div key={platform.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${platform.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="font-medium text-gray-900 dark:text-white">{platform.name}</span>
                </div>
                <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Settings
                </button>
              </div>
            ))}
            <Link href="/platforms/connect" className="block text-center py-2 text-blue-600 dark:text-blue-400 text-sm hover:underline">
              + Add more
            </Link>
          </div>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Global Sync Settings
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Auto-sync all platforms</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Automatically sync data from all connected platforms</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" value="" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Sync frequency</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">How often to sync platform data</p>
            </div>
            <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Every hour</option>
              <option>Every 6 hours</option>
              <option>Daily</option>
              <option>Weekly</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Sync notifications</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get notified when sync completes or fails</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" value="" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
