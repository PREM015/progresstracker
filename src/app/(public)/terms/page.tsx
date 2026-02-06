"use client";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold">Terms of Service</h1>
          <p className="text-gray-600 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing and using ProgressTracker, you accept and agree to be bound by the terms
              and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
            <p className="text-gray-700 leading-relaxed">
              Permission is granted to use ProgressTracker for personal progress tracking purposes.
              You may not use the service for any illegal or unauthorized purpose.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Platform Connections</h2>
            <p className="text-gray-700 leading-relaxed">
              You are responsible for ensuring you have the right to connect third-party platforms
              and share data from those platforms with ProgressTracker.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Prohibited Uses</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You may not:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Use the service for any unlawful purpose</li>
              <li>Impersonate another person or entity</li>
              <li>Attempt to gain unauthorized access</li>
              <li>Interfere with the service's operation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Termination</h2>
            <p className="text-gray-700 leading-relaxed">
              We may terminate or suspend your account at any time for violations of these terms.
              You may terminate your account at any time through account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Contact</h2>
            <p className="text-gray-700 leading-relaxed">
              Questions about the Terms of Service should be sent to{' '}
              <a href="mailto:legal@progresstracker.app" className="text-indigo-600 hover:underline">
                legal@progresstracker.app
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
