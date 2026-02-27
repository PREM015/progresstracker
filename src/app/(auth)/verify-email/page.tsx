// app/(auth)/verify-email/page.tsx
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/forms/FormError';
import { FormSuccess } from '@/components/forms/FormSuccess';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import apiClient from '@/lib/apiClient';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token');

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verified, setVerified] = useState(false);

  // Auto-verify if token is present (link-based verification)
  const verifyWithToken = useCallback(async () => {
    if (!token) return;
    setIsVerifying(true);
    setError('');
    try {
      const response = await apiClient.post('/auth/verify-email', { token });
      if (response.success) {
        setVerified(true);
        setSuccess('Email verified successfully! Redirecting to login...');
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setError(response.error || 'Verification failed. The link may have expired.');
      }
    } catch (err: any) {
      setError('Verification failed. The link may have expired.');
    } finally {
      setIsVerifying(false);
    }
  }, [token, router]);

  useEffect(() => {
    verifyWithToken();
  }, [verifyWithToken]);

  // Code-based verification
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      const response = await apiClient.post('/auth/verify-email', { code, email });
      if (response.success) {
        setVerified(true);
        setSuccess('Email verified successfully! Redirecting to login...');
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setError(response.error || 'Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      setError('Invalid verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend verification
  const handleResend = async () => {
    setIsResending(true);
    setError('');
    try {
      const response = await apiClient.post('/auth/resend-verification', { email });
      if (response.success) {
        setSuccess('A new verification code has been sent to your email.');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.error || 'Failed to resend verification. Please try again.');
      }
    } catch (err: any) {
      setError('Failed to resend verification. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Verified state
  if (verified) {
    return (
      <AuthCard title="Email Verified" showSocial={false}>
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <FormSuccess message={success || 'Your email has been verified!'} variant="block" />
          <p className="text-sm text-muted-foreground mt-4">
            Redirecting you to login...
          </p>
        </div>
      </AuthCard>
    );
  }

  // Auto-verifying with token state
  if (token && isVerifying) {
    return (
      <AuthCard title="Verifying Email" showSocial={false}>
        <div className="flex flex-col items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Verifying your email address...</p>
        </div>
      </AuthCard>
    );
  }

  // Code entry form
  return (
    <AuthCard
      title="Verify Your Email"
      description={email ? `We sent a verification code to ${email}` : 'Enter the verification code from your email'}
      footerLabel="Back to"
      footerLink="/login"
      footerLinkText="Login"
      showSocial={false}
    >
      <form onSubmit={handleVerifyCode} className="space-y-4">
        {error && <FormError message={error} variant="block" />}
        {success && <FormSuccess message={success} variant="block" />}

        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-7 w-7 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            type="text"
            value={code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(value);
              setError('');
            }}
            className="text-center text-2xl tracking-widest font-mono"
            placeholder="000000"
            maxLength={6}
            autoComplete="off"
            autoFocus
            disabled={isVerifying}
          />
          <p className="text-xs text-muted-foreground text-center">
            Enter the 6-digit code from your email
          </p>
        </div>

        <Button
          type="submit"
          disabled={isVerifying || code.length !== 6}
          className="w-full"
        >
          {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify Email
        </Button>

        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isResending}
            className="text-sm"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Sending...
              </>
            ) : (
              "Didn't receive the code? Resend"
            )}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <AuthCard title="Loading..." showSocial={false}>
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthCard>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}