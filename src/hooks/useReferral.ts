'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { ReferralService } from '@/services/api/referral.service';
import { queryKeys } from './keys';
import type { ReferralStats, ReferralCode } from '@/types/referral';

export function useReferral() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // Get referral code
  const codeQuery = useQuery({
    queryKey: queryKeys.referrals.code(),
    queryFn: () => ReferralService.getCode(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get referral stats
  const statsQuery = useQuery({
    queryKey: queryKeys.referrals.stats(),
    queryFn: () => ReferralService.getStats(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create/Generate referral code
  const createCodeMutation = useMutation({
    mutationFn: () => ReferralService.createCode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals.code() });
    },
  });

  const generateCode = useCallback(async () => {
    return createCodeMutation.mutateAsync();
  }, [createCodeMutation]);

  return useMemo(() => ({
    code: codeQuery.data ?? null,
    stats: statsQuery.data ?? null,
    isLoading: codeQuery.isLoading || statsQuery.isLoading,
    isRefetching: codeQuery.isRefetching || statsQuery.isRefetching,
    error: codeQuery.error || statsQuery.error,
    generateCode,
    isGenerating: createCodeMutation.isPending,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals.all });
    },
  }), [
    codeQuery.data,
    codeQuery.isLoading,
    codeQuery.isRefetching,
    codeQuery.error,
    statsQuery.data,
    statsQuery.isLoading,
    statsQuery.isRefetching,
    statsQuery.error,
    generateCode,
    createCodeMutation.isPending,
    queryClient,
  ]);
}

export default useReferral;
