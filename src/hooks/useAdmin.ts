/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdmin.ts
// PURPOSE: Admin hooks - dashboard, users, platforms management
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { AdminService } from '@/services/api/admin/admin.service';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================



interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    newInPeriod: number;
    newToday: number;
    newThisWeek: number;
    growthPercent: number;
  };
  platforms: {
    total: number;
    activeConnections: number;
    syncSuccessRate: number;
  };
  subscriptions: {
    free: number;
    starter: number;
    pro: number;
    enterprise: number;
    mrr: number;
    arr: number;
  };
  activity: {
    totalEntriesInPeriod: number;
    avgDailyActiveUsers: number;
  };
  system: {
    uptime: number;
    dbSizeMB: number;
    cacheHitRate: number;
    errorRate: number;
  };
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  image: string | null;
  role: 'user' | 'admin';
  isActive: boolean;
  isBanned: boolean;
  isVerified: boolean;
  createdAt: Date;
  lastActiveAt: Date | null;
  subscription?: {
    tier: string;
    status: string;
  };
  stats?: {
    platforms: number;
    entries: number;
    streak: number;
  };
}

export interface AdminUserFilters {
  search?: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'inactive' | 'banned';
  tier?: string;
  page?: number;
  limit?: number;
  [key: string]: any;
}

// =============================================================================
// ADMIN DASHBOARD HOOK
// =============================================================================

export function useAdminDashboard() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;

  const query = useQuery({
    queryKey: queryKeys.admin.dashboard(),
    queryFn: async (): Promise<AdminDashboardStats> => {
      return AdminService.getDashboard();
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// ADMIN USERS HOOK
// =============================================================================

export function useAdminUsers(filters: AdminUserFilters = {}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isAdmin = session?.user?.isAdmin ?? false;

  // ==========================================================================
  // FETCH USERS
  // ==========================================================================
  const usersQuery = useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: async (): Promise<{ users: AdminUser[]; total: number }> => {
      const params: Record<string, string> = {
        page: String(filters.page ?? 1),
        limit: String(filters.limit ?? 20),
      };

      if (filters.search) params.search = filters.search;
      if (filters.role) params.role = filters.role;
      if (filters.status) params.status = filters.status;
      if (filters.tier) params.tier = filters.tier;

      return AdminService.getUsers(params) as any;
    },
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });

  // ==========================================================================
  // BAN USER
  // ==========================================================================
  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return AdminService.banUser(userId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });

  const banUser = useCallback(
    async (userId: string, reason: string) => {
      return banMutation.mutateAsync({ userId, reason });
    },
    [banMutation]
  );

  // ==========================================================================
  // UNBAN USER
  // ==========================================================================
  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      return AdminService.unbanUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });

  const unbanUser = useCallback(
    async (userId: string) => {
      return unbanMutation.mutateAsync(userId);
    },
    [unbanMutation]
  );

  // ==========================================================================
  // VERIFY USER
  // ==========================================================================
  const verifyMutation = useMutation({
    mutationFn: async (userId: string) => {
      return AdminService.verifyUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });

  const verifyUser = useCallback(
    async (userId: string) => {
      return verifyMutation.mutateAsync(userId);
    },
    [verifyMutation]
  );

  // ==========================================================================
  // RESET PASSWORD
  // ==========================================================================
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, sendEmail }: { userId: string; sendEmail?: boolean }) => {
      return AdminService.resetPassword(userId, sendEmail);
    },
  });

  const resetUserPassword = useCallback(
    async (userId: string, sendEmail: boolean = true) => {
      return resetPasswordMutation.mutateAsync({ userId, sendEmail });
    },
    [resetPasswordMutation]
  );

  // ==========================================================================
  // IMPERSONATE USER
  // ==========================================================================
  const impersonateMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return AdminService.impersonate(userId, reason);
    },
  });

  const impersonateUser = useCallback(
    async (userId: string, reason: string) => {
      return impersonateMutation.mutateAsync({ userId, reason });
    },
    [impersonateMutation]
  );

  // ==========================================================================
  // DELETE USER
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return AdminService.deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });

  const deleteUser = useCallback(
    async (userId: string) => {
      return deleteMutation.mutateAsync(userId);
    },
    [deleteMutation]
  );

  return useMemo(() => ({
    users: usersQuery.data?.users ?? [],
    total: usersQuery.data?.total ?? 0,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,

    // Actions
    banUser,
    unbanUser,
    verifyUser,
    resetUserPassword,
    impersonateUser,
    deleteUser,
    refetch: usersQuery.refetch,

    // Mutation states
    isBanning: banMutation.isPending,
    isUnbanning: unbanMutation.isPending,
    isVerifying: verifyMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
    isImpersonating: impersonateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }), [
    usersQuery.data,
    usersQuery.isLoading,
    usersQuery.error,
    usersQuery.refetch,
    banUser,
    unbanUser,
    verifyUser,
    resetUserPassword,
    impersonateUser,
    deleteUser,
    banMutation.isPending,
    unbanMutation.isPending,
    verifyMutation.isPending,
    resetPasswordMutation.isPending,
    impersonateMutation.isPending,
    deleteMutation.isPending,
  ]);
}

// =============================================================================
// ADMIN SINGLE USER HOOK
// =============================================================================

export function useAdminUser(userId: string) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;

  const query = useQuery({
    queryKey: queryKeys.admin.user(userId),
    queryFn: async () => {
      return AdminService.getUser(userId);
    },
    enabled: isAdmin && !!userId,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// ADMIN STATS HOOK
// =============================================================================

export function useAdminStats() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;

  const query = useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: async () => {
      return AdminService.getStats();
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export { useAdminDashboard as useAdmin };
export default useAdminDashboard;