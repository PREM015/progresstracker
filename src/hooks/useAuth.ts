// ============================================================================
// FILE: src/hooks/useAuth.ts
// PURPOSE: Authentication hook - login, logout, session, register
// ============================================================================

'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';
import type { 
  LoginCredentials, 
  RegisterCredentials, 
  AuthResult,
  PasswordResetRequest,
  PasswordResetConfirm,
} from '@/types/user';

// =============================================================================
// TYPES
// =============================================================================

interface UseAuthOptions {
  redirectTo?: string;
  redirectIfAuthenticated?: string;
}

interface LoginOptions {
  redirectTo?: string;
  rememberMe?: boolean;
}

interface RegisterOptions {
  redirectTo?: string;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAuth(options: UseAuthOptions = {}) {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Computed states
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const isUnauthenticated = status === 'unauthenticated';
  const user = session?.user ?? null;

  // ==========================================================================
  // LOGIN
  // ==========================================================================
  const loginMutation = useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: async ({ 
      email, 
      password, 
      redirectTo = options.redirectTo || '/dashboard' 
    }: LoginCredentials & LoginOptions) => {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      return { success: true, redirectTo };
    },
    onSuccess: (data) => {
      // Invalidate all queries to refetch with new auth
      queryClient.invalidateQueries();
      
      if (data.redirectTo) {
        router.push(data.redirectTo);
      }
    },
  });

  const login = useCallback(
    async (credentials: LoginCredentials, loginOptions?: LoginOptions) => {
      return loginMutation.mutateAsync({
        ...credentials,
        ...loginOptions,
      });
    },
    [loginMutation]
  );

  // ==========================================================================
  // SOCIAL LOGIN
  // ==========================================================================
  const socialLogin = useCallback(
    async (provider: 'google' | 'github', callbackUrl?: string) => {
      await signIn(provider, {
        callbackUrl: callbackUrl || options.redirectTo || '/dashboard',
      });
    },
    [options.redirectTo]
  );

  // ==========================================================================
  // REGISTER
  // ==========================================================================
  const registerMutation = useMutation({
    mutationKey: ['auth', 'register'],
    mutationFn: async ({ 
      email, 
      password, 
      name, 
      username,
      acceptTerms,
      redirectTo = '/dashboard',
    }: RegisterCredentials & RegisterOptions): Promise<AuthResult> => {
      const response = await apiClient.post<AuthResult>('/auth/register', {
        email,
        password,
        name,
        username,
        acceptTerms,
      });

      if (response.error || !response.data.success) {
        throw new Error(response.error || response.data.error || 'Registration failed');
      }

      // Auto-login after registration
      const loginResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        throw new Error('Registration successful but login failed. Please try logging in.');
      }

      return { ...response.data, redirectTo } as AuthResult & { redirectTo: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      if ((data as AuthResult & { redirectTo?: string }).redirectTo) {
        router.push((data as AuthResult & { redirectTo?: string }).redirectTo!);
      }
    },
  });

  const register = useCallback(
    async (credentials: RegisterCredentials, registerOptions?: RegisterOptions) => {
      return registerMutation.mutateAsync({
        ...credentials,
        ...registerOptions,
      });
    },
    [registerMutation]
  );

  // ==========================================================================
  // LOGOUT
  // ==========================================================================
  const logoutMutation = useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: async (redirectTo: string = '/login') => {
      // Call custom logout endpoint to clean up server-side
      await apiClient.post('/auth/logout-custom');
      
      // Sign out from next-auth
      await signOut({ redirect: false });
      
      return { redirectTo };
    },
    onSuccess: (data) => {
      // Clear all cached data
      queryClient.clear();
      router.push(data.redirectTo);
    },
  });

  const logout = useCallback(
    async (redirectTo?: string) => {
      return logoutMutation.mutateAsync(redirectTo || '/login');
    },
    [logoutMutation]
  );

  // ==========================================================================
  // PASSWORD RESET
  // ==========================================================================
  const forgotPasswordMutation = useMutation({
    mutationKey: ['auth', 'forgotPassword'],
    mutationFn: async ({ email }: PasswordResetRequest) => {
      const response = await apiClient.post('/auth/forgot-password', { email });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
  });

  const forgotPassword = useCallback(
    async (email: string) => {
      return forgotPasswordMutation.mutateAsync({ email });
    },
    [forgotPasswordMutation]
  );

  const resetPasswordMutation = useMutation({
    mutationKey: ['auth', 'resetPassword'],
    mutationFn: async ({ token, newPassword, confirmPassword }: PasswordResetConfirm) => {
      const response = await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
        confirmPassword,
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
  });

  const resetPassword = useCallback(
    async (data: PasswordResetConfirm) => {
      return resetPasswordMutation.mutateAsync(data);
    },
    [resetPasswordMutation]
  );

  // ==========================================================================
  // EMAIL VERIFICATION
  // ==========================================================================
  const resendVerificationMutation = useMutation({
    mutationKey: ['auth', 'resendVerification'],
    mutationFn: async () => {
      const response = await apiClient.post('/auth/resend-verification');
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
  });

  const resendVerification = useCallback(async () => {
    return resendVerificationMutation.mutateAsync();
  }, [resendVerificationMutation]);

  // ==========================================================================
  // REFRESH SESSION
  // ==========================================================================
  const refreshSession = useCallback(async () => {
    await updateSession();
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
  }, [updateSession, queryClient]);

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Session state
    user,
    session,
    status,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    
    // Auth actions
    login,
    socialLogin,
    register,
    logout,
    forgotPassword,
    resetPassword,
    resendVerification,
    refreshSession,
    
    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
    
    // Errors
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    logoutError: logoutMutation.error,
    resetPasswordError: resetPasswordMutation.error,
  }), [
    user,
    session,
    status,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    login,
    socialLogin,
    register,
    logout,
    forgotPassword,
    resetPassword,
    resendVerification,
    refreshSession,
    loginMutation.isPending,
    loginMutation.error,
    registerMutation.isPending,
    registerMutation.error,
    logoutMutation.isPending,
    logoutMutation.error,
    resetPasswordMutation.isPending,
    resetPasswordMutation.error,
  ]);
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Simple hook to check authentication status
 */
export function useIsAuthenticated() {
  const { status } = useSession();
  return status === 'authenticated';
}

/**
 * Simple hook to get current session
 */
export function useCurrentSession() {
  const { data: session, status } = useSession();
  return {
    session,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}

/**
 * Hook that requires authentication - redirects if not authenticated
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const { status } = useSession();
  const router = useRouter();

  if (status === 'unauthenticated') {
    router.push(redirectTo);
  }

  return { isLoading: status === 'loading' };
}

/**
 * Hook that requires guest - redirects if authenticated
 */
export function useRequireGuest(redirectTo: string = '/dashboard') {
  const { status } = useSession();
  const router = useRouter();

  if (status === 'authenticated') {
    router.push(redirectTo);
  }

  return { isLoading: status === 'loading' };
}

export default useAuth;