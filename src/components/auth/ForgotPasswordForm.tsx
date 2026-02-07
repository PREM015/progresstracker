'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/forms/FormError';
import { FormSuccess } from '@/components/forms/FormSuccess';
import { AuthCard } from './AuthCard';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

// Schema specific for this form
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>('');
  const [success, setSuccess] = React.useState<string | undefined>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await axios.post('/api/auth/forgot-password', data);
      setSuccess('If an account exists with this email, you will receive a password reset link.');
    } catch (err) {
      // Don't reveal if email exists or not for security, but handle generic errors
      setSuccess('If an account exists with this email, you will receive a password reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Forgot Password"
      description="Enter your email address and we'll send you a link to reset your password."
      footerLabel="Remember your password?"
      footerLink="/login"
      footerLinkText="Back to login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <FormError message={error} variant="block" />}
        {success && <FormSuccess message={success} variant="block" />}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            disabled={isLoading}
            {...register('email')}
          />
          {errors.email && <FormError message={errors.email.message} />}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Reset Link
        </Button>
      </form>
    </AuthCard>
  );
}