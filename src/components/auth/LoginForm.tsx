'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginSchema, type LoginInput } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/forms/FormError';
import { FormSuccess } from '@/components/forms/FormSuccess';
import { AuthCard } from './AuthCard';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Auth paths we should never redirect back to
const AUTH_PATHS = [
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/magic-link',
  '/api/auth',
];

function getSafeCallbackUrl(raw: string): string {
  try {
    // Full URL — extract just the pathname+search, block cross-origin
    if (raw.startsWith('http')) {
      const url = new URL(raw);
      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';
      if (origin && url.origin !== origin) return '/dashboard';
      raw = url.pathname + url.search;
    }

    // Must start with /
    if (!raw.startsWith('/')) return '/dashboard';

    // Block redirecting back to auth pages
    if (AUTH_PATHS.some((p) => raw.startsWith(p))) return '/dashboard';

    return raw;
  } catch {
    return '/dashboard';
  }
}

export function LoginForm() {
  return (
    <React.Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>}>
      <LoginFormInner />
    </React.Suspense>
  );
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = React.useMemo(
    () => getSafeCallbackUrl(searchParams.get('callbackUrl') || '/dashboard'),
    [searchParams]
  );

  const urlError =
    searchParams.get('error') === 'OAuthAccountNotLinked'
      ? 'Email already in use with a different provider!'
      : '';

  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false, // handle redirect ourselves
      });

      if (!result) {
        setError('No response from auth server. Please try again.');
        setIsLoading(false);
        return;
      }

      if (result.error) {
        // NextAuth error codes
        const errorMap: Record<string, string> = {
          CredentialsSignin: 'Invalid email or password.',
          AccessDenied: 'Access denied. Your account may be banned.',
          Configuration: 'Server configuration error. Contact support.',
        };
        setError(errorMap[result.error] ?? 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      if (result.ok) {
        setSuccess('Login successful! Redirecting...');
        // router.push triggers a client-side navigation AFTER the
        // session cookie is already set — no race condition.
        router.push(callbackUrl);
        router.refresh(); // ensure server components re-render with session
        return;
      }

      setError('Unexpected error. Please try again.');
      setIsLoading(false);
    } catch (err) {
      console.error('[LOGIN]', err);
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      description="Enter your email to sign in to your account"
      footerLabel="Don't have an account?"
      footerLink="/register"
      footerLinkText="Sign up"
      showSocial
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* URL-level OAuth error */}
        {urlError && <FormError message={urlError} variant="block" />}

        {/* Form-level errors / success */}
        {error && <FormError message={error} variant="block" />}
        {success && <FormSuccess message={success} variant="block" />}

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isLoading}
            {...register('email')}
          />
          {errors.email && <FormError message={errors.email.message} />}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isLoading}
              {...register('password')}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLoading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.password && <FormError message={errors.password.message} />}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="premium"
          className="w-full h-12 text-base transition-all active:scale-[0.98]"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        {/* Magic link */}
        <div className="text-center pt-2">
          <Link
            href="/magic-link"
            className="text-sm font-medium text-zinc-400 hover:text-primary transition-colors hover:underline underline-offset-4"
          >
            Sign in with magic link instead
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}