// ============================================================================
// FILE: src/types/favorite.ts
// PURPOSE: Favorite-related type definitions
// ============================================================================

export type FavoriteType = 'achievement' | 'goal' | 'platform' | 'report';

export interface Favorite {
  id: string;
  userId: string;
  type: FavoriteType;
  entityId: string;
  createdAt: Date;
}

export interface FavoriteResponse {
  success: boolean;
  favorites: Favorite[];
  total: number;
}

export interface ToggleFavoriteResponse {
  success: boolean;
  isFavorited: boolean;
}
