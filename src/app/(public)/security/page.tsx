"use client";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold">Security</h1>
          <p className="text-gray-600 mt-2">Your data security is our top priority</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">🔒 Data Encryption</h2>
            <p className="text-gray-700 leading-relaxed">
              All data transmitted to and from ProgressTracker is encrypted using industry-standard
              TLS 1.3 protocol. Data at rest is encrypted using AES-256 encryption.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">🛡️ Infrastructure Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our infrastructure is hosted on enterprise-grade cloud providers with:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>24/7 monitoring and intrusion detection</li>
              <li>Regular security audits and penetration testing</li>
              <li>Automatic security patches and updates</li>
              <li>DDoS protection and rate limiting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">🔐 Authentication & Access</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement multi-layered authentication security:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Secure password hashing with bcrypt</li>
              <li>Optional two-factor authentication (2FA)</li>
              <li>OAuth 2.0 integration with trusted providers</li>
              <li>Session management with secure tokens</li>
              <li>IP-based access controls</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">📋 Compliance</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              ProgressTracker is compliant with:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>GDPR (General Data Protection Regulation)</li>
              <li>CCPA (California Consumer Privacy Act)</li>
              <li>SOC 2 Type II standards</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">🔍 Third-Party Integrations</h2>
            <p className="text-gray-700 leading-relaxed">
              When you connect third-party platforms, we use OAuth 2.0 or API keys with minimal
              required permissions. We never store your platform passwords and only access data
              necessary for progress tracking.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">📞 Report a Security Issue</h2>
            <p className="text-gray-700 leading-relaxed">
              If you discover a security vulnerability, please report it to{' '}
              <a href="mailto:security@progresstracker.app" className="text-indigo-600 hover:underline">
                security@progresstracker.app
              </a>
              . We take all reports seriously and will respond within 24 hours.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
