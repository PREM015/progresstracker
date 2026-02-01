// src/services/scrapers/topcoderScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface TopCoderMember {
  handle: string;
  maxRating?: { rating?: number };
  photoURL?: string;
}

interface TopCoderStats {
  DATA_SCIENCE?: {
    SRM?: { rating?: number; challenges?: number };
  };
  DEVELOP?: { rating?: number };
}

export class TopCoderScraper extends BaseScraper {
  platformName = 'TopCoder';
  platformSlug = 'topcoder';
  protected baseUrl = 'https://api.topcoder.com/v5';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const handle = credentials.username!;

      // TopCoder has a public API
      const memberResponse = await this.get<TopCoderMember>(`${this.baseUrl}/members/${handle}`);

      if (!memberResponse || !memberResponse.handle) {
        return this.failure(`TopCoder user "${handle}" not found`);
      }

      // Get stats
      let statsResponse: TopCoderStats | null = null;
      try {
        statsResponse = await this.get<TopCoderStats>(`${this.baseUrl}/members/${handle}/stats`);
      } catch {
        // Stats might not be available
      }

      const algorithmRating =
        statsResponse?.DATA_SCIENCE?.SRM?.rating || statsResponse?.DEVELOP?.rating || 0;

      const challenges = statsResponse?.DATA_SCIENCE?.SRM?.challenges || 0;

      const entries =
        challenges > 0
          ? [
              {
                date: new Date(),
                problems: challenges,
                notes: `TopCoder profile synced. Rating: ${algorithmRating}`,
              },
            ]
          : [];

      return this.success(entries, {
        username: handle,
        profileUrl: `https://www.topcoder.com/members/${handle}`,
        avatarUrl: memberResponse.photoURL,
        rating: algorithmRating,
        rank: memberResponse.maxRating?.rating?.toString(),
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default TopCoderScraper;