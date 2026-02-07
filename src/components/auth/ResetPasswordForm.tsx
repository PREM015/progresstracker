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
import { Loader2 } from 'lucide-react';
import axios from 'axios';

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>('');
  const [success, setSuccess] = React.useState<string | undefined>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) {
      setError('Missing reset token');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await axios.post('/api/auth/reset-password', {
        token,
        password: data.password,
      });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Invalid Link" description="This password reset link is invalid or has expired.">
        <FormError message="Missing reset token" variant="block" />
        <Button className="w-full mt-4" onClick={() => router.push('/forgot-password')}>
          Request new link
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
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <FormError message={error} variant="block" />}
        {success && <FormSuccess message={success} variant="block" />}

        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            disabled={isLoading}
            {...register('password')}
          />
          {errors.password && <FormError message={errors.password.message} />}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            disabled={isLoading}
            {...register('confirmPassword')}
          />
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