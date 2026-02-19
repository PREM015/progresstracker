'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FormError } from '@/components/forms/FormError';
import { FormSuccess } from '@/components/forms/FormSuccess';
import { AuthCard } from './AuthCard';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/apiClient';
import Link from 'next/link';

// Enhanced register schema with username and terms
const registerFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, underscores, and hyphens'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
});

type RegisterFormInput = z.infer<typeof registerFormSchema>;

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

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>('');
  const [success, setSuccess] = React.useState<string | undefined>('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      acceptTerms: false as unknown as true,
    },
  });

  const password = watch('password') || '';
  const { score, checks } = getPasswordStrength(password);
  const { label: strengthLabel, color: strengthColor } = getStrengthLabel(score);

  const onSubmit = async (data: RegisterFormInput) => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/register', {
        name: data.name,
        username: data.username,
        email: data.email,
        password: data.password,
        acceptTerms: data.acceptTerms,
      });

      if (response.success) {
        setSuccess('Account created! Check your email to verify your account.');
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        }, 2000);
      } else {
        setError(response.error || 'Something went wrong');
      }
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const acceptTerms = watch('acceptTerms');

  return (
    <AuthCard
      title="Create an account"
      description="Start tracking your coding journey"
      footerLabel="Already have an account?"
      footerLink="/login"
      footerLinkText="Sign in"
      showSocial
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <FormError message={error} variant="block" />}
        {success && <FormSuccess message={success} variant="block" />}

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            disabled={isLoading}
            {...register('name')}
          />
          {errors.name && <FormError message={errors.name.message} />}
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="johndoe"
            disabled={isLoading}
            {...register('username')}
          />
          {errors.username && <FormError message={errors.username.message} />}
        </div>

        {/* Email */}
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

        {/* Password with visibility toggle */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
              {/* Strength bar */}
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

              {/* Requirements checklist */}
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

        {/* Terms & Conditions */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(checked) =>
              setValue('acceptTerms', checked === true ? true : (false as unknown as true), {
                shouldValidate: true,
              })
            }
            disabled={isLoading}
            className="mt-0.5"
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I agree to the{' '}
              <Link href="/terms" className="text-primary hover:underline" target="_blank">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                Privacy Policy
              </Link>
            </label>
            {errors.acceptTerms && (
              <FormError message={errors.acceptTerms.message} />
            )}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </form>
    </AuthCard>
  );
}