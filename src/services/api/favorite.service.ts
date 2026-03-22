import { httpClient } from '@/lib/http-client';
import { Favorite, FavoriteType, FavoriteResponse, ToggleFavoriteResponse } from '@/types/favorite';

const BASE_URL = '/favorites';

export const FavoriteService = {
  /**
   * Get user favorites
   */
  getFavorites: async (type?: FavoriteType): Promise<Favorite[]> => {
    const response = await httpClient.get<FavoriteResponse>(BASE_URL, {
      params: type ? { type } : undefined
    });
    return response.favorites || [];
  },

  /**
   * Toggle favorite status
   */
  toggleFavorite: async (type: FavoriteType, entityId: string): Promise<boolean> => {
    const response = await httpClient.post<ToggleFavoriteResponse>(`${BASE_URL}/toggle`, {
      type,
      entityId
    });
    return response.isFavorited;
  },

  /**
   * Check if an entity is favorited
   */
  isFavorited: async (type: FavoriteType, entityId: string): Promise<boolean> => {
    const response = await httpClient.get<{ isFavorited: boolean }>(`${BASE_URL}/check`, {
      params: { type, entityId }
    });
    return response.isFavorited;
  }
};
