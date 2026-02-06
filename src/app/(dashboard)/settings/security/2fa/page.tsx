"use client";

import { useState, useEffect } from "react";

export default function TwoFactorAuthPage() {
  const [enabled, setEnabled] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetch('/api/auth/2fa/status')
      .then(r => r.json())
      .then(data => {
        setEnabled(data.enabled);
        if (!data.enabled) {
          return fetch('/api/auth/2fa/setup').then(r => r.json());
        }
      })
      .then(setupData => {
        if (setupData) {
          setQrCode(setupData.qrCode);
          setSecret(setupData.secret);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const enableTwoFactor = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });
      if (res.ok) {
        setEnabled(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!confirm('Are you sure you want to disable 2FA?')) return;

    await fetch('/api/auth/2fa/disable', { method: 'POST' });
    setEnabled(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Two-Factor Authentication</h1>

        {enabled ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">2FA is Enabled</h2>
                <p className="text-sm text-gray-600">Your account is protected with two-factor authentication</p>
              </div>
            </div>

            <button
              onClick={disableTwoFactor}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Disable 2FA
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Set Up Two-Factor Authentication</h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-2">Step 1: Scan QR Code</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Use an authenticator app like Google Authenticator or Authy to scan this QR code:
                </p>
                {qrCode && (
                  <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold mb-2">Step 2: Or Enter This Code Manually</h3>
                <code className="block p-3 bg-gray-100 rounded text-center font-mono">
                  {secret}
                </code>
              </div>

              <div>
                <h3 className="font-bold mb-2">Step 3: Verify</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-2xl font-mono mb-4"
                  maxLength={6}
                />
                <button
                  onClick={enableTwoFactor}
                  disabled={verifyCode.length !== 6 || verifying}
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
