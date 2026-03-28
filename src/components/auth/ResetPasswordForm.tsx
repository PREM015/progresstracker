'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/forms/FormError';
import { FormSuccess } from '@/components/forms/FormSuccess';
import { AuthCard } from './AuthCard';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/apiClient';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Password strength helpers
function getPasswordStrength(password: string) {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };

  Object.values(checks).forEach((passed) => {
    if (passed) score++;
  });

  return { score, checks };
}

function getStrengthLabel(score: number) {
  if (score <= 1) return { label: 'Very Weak', color: 'bg-red-500' };
  if (score === 2) return { label: 'Weak', color: 'bg-orange-500' };
  if (score === 3) return { label: 'Fair', color: 'bg-yellow-500' };
  if (score === 4) return { label: 'Strong', color: 'bg-green-500' };
  return { label: 'Very Strong', color: 'bg-emerald-500' };
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>('');
  const [success, setSuccess] = React.useState<string | undefined>('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password') || '';
  const { score, checks } = getPasswordStrength(password);
  const { label: strengthLabel, color: strengthColor } = getStrengthLabel(score);

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) {
      setError('Missing reset token');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/reset-password', {
        token,
        password: data.password,
         confirmPassword: data.confirmPassword,
      });
      if (response.success) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(response.error || 'Something went wrong. Please try again.');
      }
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Invalid Link" description="This password reset link is invalid or has expired." showSocial={false}>
        <FormError message="Missing reset token. Please request a new password reset link." variant="block" />
        <Button className="w-full mt-4" onClick={() => router.push('/forgot-password')}>
          Request New Link
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset Password"
      description="Enter your new password below."
      footerLabel="Remember your password?"
      footerLink="/login"
      footerLinkText="Back to login"
      showSocial={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <FormError message={error} variant="block" />}
        {success && <FormSuccess message={success} variant="block" />}

        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
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
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">
                {showPassword ? 'Hide password' : 'Show password'}
              </span>
            </Button>
          </div>
          {errors.password && <FormError message={errors.password.message} />}

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-all duration-300',
                      i <= score ? strengthColor : 'bg-zinc-200 dark:bg-zinc-700'
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Strength: <span className="font-medium">{strengthLabel}</span>
              </p>

              <div className="grid grid-cols-2 gap-1">
                {[
                  { key: 'length', label: '8+ characters' },
                  { key: 'lowercase', label: 'Lowercase' },
                  { key: 'uppercase', label: 'Uppercase' },
                  { key: 'number', label: 'Number' },
                  { key: 'special', label: 'Special char' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    {checks[key as keyof typeof checks] ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <X className="h-3 w-3 text-zinc-400" />
                    )}
                    <span
                      className={cn(
                        'text-xs transition-colors',
                        checks[key as keyof typeof checks]
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              disabled={isLoading}
              {...register('confirmPassword')}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirm((prev) => !prev)}
              disabled={isLoading}
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">
                {showConfirm ? 'Hide password' : 'Show password'}
              </span>
            </Button>
          </div>
          {errors.confirmPassword && <FormError message={errors.confirmPassword.message} />}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Reset Password
        </Button>
      </form>
    </AuthCard>
  );
}