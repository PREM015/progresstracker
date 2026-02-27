// src/services/scrapers/swocScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class SWoCScraper extends BaseScraper {
  platformName = 'Social Winter of Code';
  platformSlug = 'swoc';
  protected baseUrl = 'https://swoc.scriptindia.org';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Try to fetch from SWoC API/leaderboard if available
      try {
        const response = await this.get<{
          contributions?: number;
          prs_merged?: number;
          points?: number;
          rank?: number;
        }>(`${this.baseUrl}/api/participant/${username}`);

        if (response) {
          const entries = [
            {
              date: new Date(),
              problems: response.contributions || response.prs_merged || 0,
              points: response.points,
              notes: `SWoC: ${response.prs_merged || 0} PRs merged, ${response.points || 0} points`,
            },
          ];

          return this.success(entries, {
            username,
            profileUrl: `https://github.com/${username}`,
            totalProblems: response.contributions || response.prs_merged,
            points: response.points,
            rank: response.rank?.toString(),
          });
        }
      } catch {
        // Fall through
      }

      return this.notSupported(
        'Social Winter of Code participant data not found. Please track your contributions, PRs merged, and points manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default SWoCScraper;