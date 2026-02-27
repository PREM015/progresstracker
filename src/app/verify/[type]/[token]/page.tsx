"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function VerifyPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const token = params.token as string;

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/verify/${type}/${token}`, { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSuccess(true);
          setTimeout(() => router.push('/dashboard'), 3000);
        } else {
          setError(data.error || 'Verification failed');
        }
      })
      .catch(err => {
        setError('Verification failed');
        console.error(err);
      })
      .finally(() => setVerifying(false));
  }, [type, token, router]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-12 text-center">
        {success ? (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">✓</span>
            </div>
            <h1 className="text-3xl font-bold mb-4">Verification Successful!</h1>
            <p className="text-gray-600 mb-8">
              {type === 'email' && 'Your email has been verified.'}
              {type === 'password-reset' && 'You can now reset your password.'}
              {type === 'account' && 'Your account has been activated.'}
            </p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">✕</span>
            </div>
            <h1 className="text-3xl font-bold mb-4">Verification Failed</h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <a
              href="/"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-block"
            >
              Return Home
            </a>
          </>
        )}
      </div>
    </div>
  );
}
