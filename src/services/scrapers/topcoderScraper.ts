// src/services/scrapers/topcoderScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class TopCoderScraper extends BaseScraper {
  platformName = 'TopCoder';
  platformSlug = 'topcoder';
  protected baseUrl = 'https://api.topcoder.com/v5';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const handle = credentials.username!;

      // TopCoder has a public API
      const memberResponse = await this.get<any>(
        `${this.baseUrl}/members/${handle}`
      );

      if (!memberResponse || memberResponse.error) {
        return this.failure(`TopCoder user "${handle}" not found`);
      }

      // Get stats
      const statsResponse = await this.get<any>(
        `${this.baseUrl}/members/${handle}/stats`
      );

      const algorithmRating = statsResponse?.DATA_SCIENCE?.SRM?.rating || 
                              statsResponse?.DEVELOP?.rating || 0;

      const entries = [{
        date: new Date(),
        problems: statsResponse?.DATA_SCIENCE?.SRM?.challenges || 0,
        notes: `TopCoder profile synced. Rating: ${algorithmRating}`,
      }];

      return this.success(entries, {
        username: handle,
        profileUrl: `https://www.topcoder.com/members/${handle}`,
        rating: algorithmRating,
        rank: memberResponse.maxRating?.rating?.toString(),
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default TopCoderScraper;