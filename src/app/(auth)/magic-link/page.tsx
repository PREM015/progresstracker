// app/(auth)/magic-link/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/forms/FormError';
import { FormSuccess } from '@/components/forms/FormSuccess';
import { Loader2, Mail, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import Link from 'next/link';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

function MagicLinkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Token verification states
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');

  // If token is present, verify the magic link automatically
  useEffect(() => {
    if (token) {
      verifyMagicLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const verifyMagicLink = async () => {
    setVerifyStatus('verifying');
    try {
      const result = await signIn('email', {
        token,
        redirect: false,
      });

      if (result?.error) {
        setVerifyStatus('error');
        setError(result.error);
      } else if (result?.ok) {
        setVerifyStatus('success');
        setTimeout(() => {
          router.push(callbackUrl);
        }, 2000);
      }
    } catch (err) {
      console.error('Magic link verification error:', err);
      setVerifyStatus('error');
      setError('Verification failed. The link may be invalid or expired.');
    }
  };

  // Token verification UI
  if (token) {
    if (verifyStatus === 'verifying') {
      return (
        <AuthCard title="Verifying Magic Link" showSocial={false}>
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Signing you in...</p>
          </div>
        </AuthCard>
      );
    }

    if (verifyStatus === 'success') {
      return (
        <AuthCard title="Success!" showSocial={false}>
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <FormSuccess message="You've been signed in successfully!" variant="block" />
            <p className="text-sm text-muted-foreground mt-4">Redirecting...</p>
          </div>
        </AuthCard>
      );
    }

    if (verifyStatus === 'error') {
      return (
        <AuthCard title="Verification Failed" showSocial={false}>
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <FormError message={error || 'The magic link is invalid or has expired.'} variant="block" />
            <div className="space-y-2 pt-2">
              <Button className="w-full" onClick={() => router.push('/magic-link')}>
                Request New Link
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          </div>
        </AuthCard>
      );
    }
  }

  // Request form - success state
  if (success) {
    return (
      <AuthCard
        title="Check Your Email"
        showSocial={false}
        footerLabel="Wrong email?"
        footerLink="/magic-link"
        footerLinkText="Try again"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>

          <FormSuccess message={`Magic link sent to ${email}`} variant="block" />

          <p className="text-sm text-muted-foreground">
            Click the link in your email to sign in. The link will expire in 15 minutes.
          </p>

          <div className="pt-2 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSuccess(false)}
            >
              Send Another Link
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/login">← Back to Login</Link>
            </Button>
          </div>
        </div>
      </AuthCard>
    );
  }

  // Request form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/magic-link', { email });
      if (response.error) {
        setError(response.error);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError('Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Magic Link Sign In"
      description="Get a password-free sign in link sent to your email"
      footerLabel="Prefer password?"
      footerLink="/login"
      footerLinkText="Sign in with password"
      showSocial={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError message={error} variant="block" />}

        <div className="flex justify-center mb-2">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-indigo-500" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="magic-email">Email Address</Label>
          <Input
            id="magic-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="name@example.com"
            required
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send Magic Link
            </>
          )}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={
      <AuthCard title="Loading..." showSocial={false}>
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthCard>
    }>
      <MagicLinkContent />
    </Suspense>
  );
}