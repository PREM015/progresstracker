"use client";

import { useState } from "react";

export default function DangerZonePage() {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;

    setDeleting(true);
    try {
      await fetch('/api/user/delete-account', { method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-red-600">Danger Zone</h1>

        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Delete Account</h2>
          <p className="text-gray-700 mb-6">
            Once you delete your account, there is no going back. All your data, progress, achievements,
            and settings will be permanently deleted. This action cannot be undone.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-600"
              placeholder="Type DELETE"
            />
          </div>

          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== "DELETE" || deleting}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting Account...' : 'Permanently Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
