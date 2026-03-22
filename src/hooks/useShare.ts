'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { ShareService } from '@/services/api/share.service';
import { ShareType } from '@/types/share';

export function useShare() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  const linksQuery = useQuery({
    queryKey: ['share-links'],
    queryFn: () => ShareService.getLinks(),
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: { type: ShareType; entityId?: string }) =>
      ShareService.createLink(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => ShareService.revokeLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links'] });
    },
  });

  return useMemo(() => ({
    links: linksQuery.data ?? [],
    isLoading: linksQuery.isLoading,
    createShare: (type: ShareType, entityId?: string) => createMutation.mutateAsync({ type, entityId }),
    revokeShare: (id: string) => revokeMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isRevoking: revokeMutation.isPending
  }), [linksQuery, createMutation, revokeMutation]);
}

export default useShare;
