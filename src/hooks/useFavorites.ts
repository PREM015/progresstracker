'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { FavoriteService } from '@/services/api/favorite.service';
import { FavoriteType } from '@/types/favorite';

export function useFavorites(type?: FavoriteType) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  const favoritesQuery = useQuery({
    queryKey: ['favorites', type],
    queryFn: () => FavoriteService.getFavorites(type),
    enabled: isAuthenticated,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ type, entityId }: { type: FavoriteType; entityId: string }) =>
      FavoriteService.toggleFavorite(type, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const toggleFavorite = useCallback(async (type: FavoriteType, entityId: string) => {
    return toggleMutation.mutateAsync({ type, entityId });
  }, [toggleMutation]);

  return useMemo(() => ({
    favorites: favoritesQuery.data ?? [],
    isLoading: favoritesQuery.isLoading,
    isToggling: toggleMutation.isPending,
    toggleFavorite,
    refetch: favoritesQuery.refetch
  }), [favoritesQuery, toggleMutation, toggleFavorite]);
}

export default useFavorites;
