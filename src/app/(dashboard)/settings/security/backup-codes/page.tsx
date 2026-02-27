"use client";

import { useState, useEffect } from "react";

export default function BackupCodesPage() {
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/auth/2fa/backup-codes')
      .then(r => r.json())
      .then(data => setCodes(data.codes || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const generateNew = async () => {
    if (codes.length > 0 && !confirm('This will invalidate all existing backup codes. Continue?')) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/auth/2fa/backup-codes/generate', { method: 'POST' });
      const data = await res.json();
      setCodes(data.codes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const downloadCodes = () => {
    const text = codes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
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
        <h1 className="text-4xl font-bold mb-8">Backup Codes</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
          <h3 className="font-bold text-yellow-900 mb-2">⚠️ Important</h3>
          <p className="text-sm text-yellow-800">
            Save these backup codes in a secure location. You can use them to access your account
            if you lose access to your 2FA device. Each code can only be used once.
          </p>
        </div>

        {codes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🔑</span>
            <p className="mt-4 text-gray-500 mb-6">No backup codes generated yet</p>
            <button
              onClick={generateNew}
              disabled={generating}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Backup Codes'}
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {codes.map((code, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg text-center font-mono text-lg">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={downloadCodes}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Download Codes
              </button>
              <button
                onClick={generateNew}
                disabled={generating}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
