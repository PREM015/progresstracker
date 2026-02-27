"use client";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-xl p-12 text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🔧</span>
        </div>

        <h1 className="text-4xl font-bold mb-4">We'll Be Right Back</h1>
        <p className="text-gray-600 mb-8">
          We're performing scheduled maintenance to improve your experience.
          We expect to be back shortly.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            If you have urgent questions, please contact us at{' '}
            <a href="mailto:support@progresstracker.app" className="text-indigo-600 hover:underline">
              support@progresstracker.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
