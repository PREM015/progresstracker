// components/auth/TwoFactorVerify.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/forms/FormError';
import { AuthCard } from './AuthCard';
import { Loader2 } from 'lucide-react';

export function TwoFactorVerify() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code || (useBackupCode ? code.length < 8 : code.length !== 6)) {
      setError('Please enter a valid code');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/2fa/verify', {
        code,
        method: useBackupCode ? 'backup_code' : 'totp',
      });

      if (response.error) {
        setError(response.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Two-Factor Authentication"
      description={useBackupCode ? "Enter one of your backup codes" : "Enter the code from your authenticator app"}
      showSocial={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError message={error} variant="block" />}

        <div className="space-y-2">
          <Label htmlFor="code">
            {useBackupCode ? 'Backup Code' : 'Authentication Code'}
          </Label>
          <Input
            id="code"
            type="text"
            value={code}
            onChange={(e) => {
              const value = useBackupCode
                ? e.target.value.toUpperCase()
                : e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(value);
              setError('');
            }}
            className="text-center text-2xl tracking-widest font-mono"
            placeholder={useBackupCode ? 'XXXX-XXXX-XXXX' : '000000'}
            maxLength={useBackupCode ? 14 : 6}
            autoComplete="off"
            autoFocus
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !code}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setCode('');
            setError('');
          }}
          className="w-full"
        >
          {useBackupCode ? 'Use authenticator app' : 'Use backup code instead'}
        </Button>
      </form>
    </AuthCard>
  );
}