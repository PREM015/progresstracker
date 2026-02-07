"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface CustomPlatform {
  id: string;
  name: string;
  apiUrl: string;
  authType: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
}

export default function CustomPlatformDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [platform, setPlatform] = useState<CustomPlatform | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    apiUrl: "",
    authType: "bearer",
    description: "",
  });

  useEffect(() => {
    fetchPlatform();
  }, [id]);

  const fetchPlatform = async () => {
    try {
      const res = await fetch(`/api/platforms/custom/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPlatform(data.platform);
        setFormData({
          name: data.platform.name,
          apiUrl: data.platform.apiUrl,
          authType: data.platform.authType,
          description: data.platform.description || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch platform:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/platforms/custom/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsEditing(false);
        fetchPlatform();
      }
    } catch (error) {
      console.error("Failed to update platform:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this custom platform? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/platforms/custom/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard/platforms");
      }
    } catch (error) {
      console.error("Failed to delete platform:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">Loading platform...</p>
        </div>
      </div>
    );
  }

  if (!platform) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Platform not found</h2>
          <p className="text-gray-600 mb-6">The custom platform you're looking for doesn't exist.</p>
          <Link href="/dashboard/platforms" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 inline-block transition-colors">
            Back to Platforms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/dashboard/platforms" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Platforms
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {platform.icon || platform.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-extrabold text-gray-900">{platform.name}</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${platform.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                    {platform.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-gray-600">Custom integration platform</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                {isEditing ? "Cancel" : "Edit"}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          {platform.description && (
            <p className="text-gray-700 leading-relaxed">{platform.description}</p>
          )}
        </div>

        {/* Details / Edit Form */}
        {isEditing ? (
          <form onSubmit={handleUpdate} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Platform</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Platform Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="My Custom Platform"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">API URL *</label>
                <input
                  type="url"
                  required
                  value={formData.apiUrl}
                  onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="https://api.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Authentication Type</label>
                <select
                  value={formData.authType}
                  onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                >
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="oauth2">OAuth 2.0</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                  placeholder="Optional description for this platform..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Platform Details</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">API Endpoint</label>
                  <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg">{platform.apiUrl}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">Authentication</label>
                  <p className="text-gray-900 font-medium">{platform.authType.replace("_", " ").toUpperCase()}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">Created At</label>
                  <p className="text-gray-900 font-medium">{new Date(platform.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">Last Synced</label>
                  <p className="text-gray-900 font-medium">
                    {platform.lastSyncedAt ? new Date(platform.lastSyncedAt).toLocaleDateString() : "Never"}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <button className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
