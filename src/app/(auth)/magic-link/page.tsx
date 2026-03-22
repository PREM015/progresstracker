// app/(auth)/magic-link/page.tsx
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/forms/FormError';
import { FormSuccess } from '@/components/forms/FormSuccess';
import { Loader2, Mail, Sparkles, CheckCircle, XCircle, Clock } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import Link from 'next/link';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

function MagicLinkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const callbackUrlParam = searchParams.get('callbackUrl');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Token verification states
  const [verifyStatus, setVerifyStatus] = useState<
    'idle' | 'verifying' | 'success' | 'expired' | 'error'
  >('idle');

  // Guard against React StrictMode double-firing
  const verifyingRef = React.useRef(false);

  const verifyAndLogin = useCallback(async (tokenValue: string) => {
    setVerifyStatus('verifying');

    try {
      // Step 1: Verify token via PUT /api/auth/magic-link
      const verifyRes = await fetch('/api/auth/magic-link', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenValue }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        // Distinguish between expired tokens and other errors
        const errorText = String(verifyData.error ?? '').toLowerCase();
        if (verifyRes.status === 400 && errorText.includes('expired')) {
          setVerifyStatus('expired');
          setError(verifyData.error);
        } else {
          setVerifyStatus('error');
          setError(verifyData.error || 'Magic link is invalid or expired.');
        }
        return;
      }

      console.log('[MAGIC-LINK-PAGE] Token verified for:', verifyData.user?.email);

      // Step 2: Resolve callbackUrl (param → sessionStorage → /dashboard)
      let callbackUrl = callbackUrlParam || '/dashboard';
      if (callbackUrl === '/dashboard' && typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('auth_callback_url');
        if (stored) {
          callbackUrl = stored;
          sessionStorage.removeItem('auth_callback_url');
        }
      }

      // Step 3: Create NextAuth session — NextAuth handles the redirect
      await signIn('credentials', {
        email: verifyData.user.email,
        loginType: 'magic-link',
        callbackUrl,
      });

      // Fallback if signIn didn't redirect (shouldn't happen with redirect:true)
      window.location.href = callbackUrl;
    } catch (err) {
      console.error('[MAGIC-LINK-PAGE] Verification error:', err);
      setVerifyStatus('error');
      setError('Verification failed. The link may be invalid or expired.');
    }
  }, [callbackUrlParam]);

  // If token is present, verify the magic link automatically
  useEffect(() => {
    if (token && !verifyingRef.current) {
      verifyingRef.current = true;

      // ✅ SECURITY: Remove token from URL immediately — prevents:
      // - Token in browser history
      // - Token leaking via Referer header
      // - Token visible in analytics/monitoring
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/magic-link');
      }

      verifyAndLogin(token);
    }
  }, [token, verifyAndLogin]);

  // ── Token Verification UI ────────────────────────────────────
  if (token || verifyStatus !== 'idle') {
    if (verifyStatus === 'idle' || verifyStatus === 'verifying') {
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

    if (verifyStatus === 'expired') {
      return (
        <AuthCard title="Link Expired" showSocial={false}>
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <FormError
              message={error || 'This magic link has expired. Magic links are valid for 15 minutes.'}
              variant="block"
            />
            <div className="space-y-2 pt-2">
              <Button className="w-full" onClick={() => router.push('/magic-link')}>
                Request New Link
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/login">← Back to Login</Link>
              </Button>
            </div>
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
                <Link href="/login">← Back to Login</Link>
              </Button>
            </div>
          </div>
        </AuthCard>
      );
    }
  }

  // ── Request form — sent successfully state ────────────────────
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

  // ── Request form ──────────────────────────────────────────────
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
    } catch {
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