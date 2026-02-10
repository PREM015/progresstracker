"use client";

import { WaitlistForm } from "@/components/waitlist";

export default function WaitlistPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="text-6xl mb-6">🚀</div>
        <h1 className="text-5xl font-bold mb-4">Join the Waitlist</h1>
        <p className="text-xl text-gray-600 mb-8">
          Be the first to know when we launch new features and exclusive access
        </p>

        <WaitlistForm />

        <div className="mt-12 grid md:grid-cols-3 gap-8">
          <div>
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-bold mb-1">Early Access</h3>
            <p className="text-sm text-gray-600">Get exclusive early access to new features</p>
          </div>
          <div>
            <div className="text-3xl mb-2">💰</div>
            <h3 className="font-bold mb-1">Special Pricing</h3>
            <p className="text-sm text-gray-600">Discounted rates for early supporters</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🎁</div>
            <h3 className="font-bold mb-1">Exclusive Content</h3>
            <p className="text-sm text-gray-600">Access to beta features and updates</p>
          </div>
        </div>
      </div>
    </div>
  );
}
