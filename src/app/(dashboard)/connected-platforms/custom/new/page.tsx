"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCustomPlatformPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    apiUrl: "",
    authType: "bearer",
    description: "",
    icon: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/platforms/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/platforms/custom/${data.platform.id}`);
      }
    } catch (error) {
      console.error("Failed to create platform:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/20 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Create Custom Platform</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect your own API or service to track progress from any platform
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Platform Name */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Platform Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., My Custom Tracker"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              <p className="mt-2 text-sm text-gray-600">Give your platform a descriptive name</p>
            </div>

            {/* API URL */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                API Endpoint URL *
              </label>
              <input
                type="url"
                required
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-mono focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              <p className="mt-2 text-sm text-gray-600">The base URL for your API</p>
            </div>

            {/* Authentication Type */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Authentication Method *
              </label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "bearer", label: "Bearer Token", icon: "🔑" },
                  { value: "api_key", label: "API Key", icon: "🗝️" },
                  { value: "oauth2", label: "OAuth 2.0", icon: "🔐" },
                  { value: "basic", label: "Basic Auth", icon: "👤" },
                ].map((auth) => (
                  <label
                    key={auth.value}
                    className={`relative flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.authType === auth.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <input
                      type="radio"
                      name="authType"
                      value={auth.value}
                      checked={formData.authType === auth.value}
                      onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                      className="sr-only"
                    />
                    <span className="text-2xl">{auth.icon}</span>
                    <span className={`font-semibold ${formData.authType === auth.value ? "text-blue-700" : "text-gray-700"
                      }`}>
                      {auth.label}
                    </span>
                    {formData.authType === auth.value && (
                      <svg className="absolute top-2 right-2 w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Icon (emoji) */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Icon (Optional)
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="🚀"
                maxLength={2}
                className="w-24 px-4 py-3 border-2 border-gray-200 rounded-xl text-3xl text-center focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              <p className="mt-2 text-sm text-gray-600">Choose an emoji to represent this platform</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Describe what this platform tracks and how it integrates with your workflow..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
              />
              <p className="mt-2 text-sm text-gray-600">Help yourself remember what this platform is for</p>
            </div>

            {/* Info Box */}
            <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">API Requirements</h3>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    Your API should provide endpoints for fetching progress data. After creating this platform, you'll be able to configure authentication credentials and data mappings.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6">
              <Link
                href="/dashboard/platforms"
                className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-center hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </span>
                ) : (
                  "Create Platform"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Link */}
        <div className="mt-8 text-center">
          <Link href="/support/knowledge-base" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Need help setting up your custom platform?
          </Link>
        </div>
      </div>
    </div>
  );
}
