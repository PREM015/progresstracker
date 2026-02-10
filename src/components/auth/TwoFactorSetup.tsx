// components/auth/TwoFactorSetup.tsx
'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/forms/FormError';
import { FormSuccess } from '@/components/forms/FormSuccess';
import { Loader2 } from 'lucide-react';

export function TwoFactorSetup() {
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    try {
      const response = await apiClient.post('/auth/2fa/setup');

      if (response.error) {
        setError(response.error);
      } else {
        setSetupData(response.data);
      }
    } catch (err) {
      console.error('2FA setup error:', err);
      setError('Failed to initialize 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/2fa/verify', {
        code: verificationCode,
      });

      if (response.error) {
        setError(response.error);
      } else {
        setStep('complete');
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !setupData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="text-center py-8">
        <FormSuccess message="2FA Enabled Successfully!" variant="block" className="mb-6" />

        <p className="text-muted-foreground mb-6">
          Your account is now protected with two-factor authentication
        </p>

        {setupData?.backupCodes && (
          <div className="mb-6 p-4 bg-muted rounded-lg border">
            <p className="text-sm font-medium mb-3">
              <strong>Save your backup codes!</strong> You can use these to access your account if you lose your authenticator device.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {setupData.backupCodes.map((code, i) => (
                <div key={i} className="p-2 bg-background rounded border">
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={() => window.location.href = '/settings/security'}
          className="w-full sm:w-auto"
        >
          Go to Security Settings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <FormError message={error} variant="block" />}

      {step === 'setup' && setupData && (
        <>
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">Scan QR Code</h3>

            <div className="inline-block p-4 bg-white rounded-lg border shadow-sm">
              <Image
                src={setupData.qrCodeUrl}
                alt="2FA QR Code"
                width={200}
                height={200}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg border">
            <p className="text-xs text-muted-foreground mb-2">
              Can't scan? Enter this code manually:
            </p>
            <p className="font-mono text-sm break-all font-medium">
              {setupData.secret}
            </p>
          </div>

          <Button
            onClick={() => setStep('verify')}
            className="w-full"
          >
            I've Scanned the Code
          </Button>
        </>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Enter Verification Code</Label>
            <Input
              id="code"
              type="text"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
                setError('');
              }}
              className="text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
              maxLength={6}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="space-y-2">
            <Button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Enable 2FA
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep('setup')}
              className="w-full"
            >
              ← Back to QR Code
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}