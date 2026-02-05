import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

async function getEmailChangeRequest() {
  // Fetch any pending email change request
  return null;
}

export default async function EmailChangePage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  const pendingRequest = await getEmailChangeRequest();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Change Email Address
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Update the email address associated with your account
        </p>

        {pendingRequest && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You have a pending email change request to: <strong>{pendingRequest.newEmail}</strong>
            </p>
            <button className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 underline">
              Cancel request
            </button>
          </div>
        )}

        <form className="space-y-6">
          <div>
            <label htmlFor="current-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Email
            </label>
            <input
              type="email"
              id="current-email"
              value={session.user?.email || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Email Address
            </label>
            <input
              type="email"
              id="new-email"
              name="newEmail"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter new email address"
            />
          </div>

          <div>
            <label htmlFor="confirm-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Email
            </label>
            <input
              type="email"
              id="confirm-email"
              name="confirmEmail"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Confirm new email address"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter your password to confirm"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Important Information:
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>You'll receive verification emails at both addresses</li>
              <li>You must verify both emails to complete the change</li>
              <li>The change will take effect after both verifications</li>
              <li>Your login credentials will be updated automatically</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Request Email Change
            </button>
            <button
              type="button"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
