import { httpClient } from '@/lib/http-client';
import { ShareLink, ShareType, ShareResponse, UserSharesResponse, ShareStats } from '@/types/share';

const BASE_URL = '/share';

export const ShareService = {
  /**
   * Get all share links for current user
   */
  getLinks: async (): Promise<ShareLink[]> => {
    const response = await httpClient.get<UserSharesResponse>(`${BASE_URL}/links`);
    return response.shares || [];
  },

  /**
   * Create a new share link
   */
  createLink: async (data: { type: ShareType; entityId?: string }): Promise<ShareLink> => {
    const response = await httpClient.post<ShareResponse>(`${BASE_URL}/links`, data);
    return response.share!;
  },

  /**
   * Revoke a share link
   */
  revokeLink: async (id: string): Promise<boolean> => {
    const response = await httpClient.delete<{ success: boolean }>(`${BASE_URL}/links/${id}`);
    return response.success;
  },

  /**
   * Get stats for a share link
   */
  getStats: async (id: string): Promise<ShareStats> => {
    return httpClient.get<ShareStats>(`${BASE_URL}/links/${id}/stats`);
  }
};
