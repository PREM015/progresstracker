// src/services/scrapers/kwocScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class KWoCScraper extends BaseScraper {
  platformName = 'KWoC';
  platformSlug = 'kwoc';
  protected baseUrl = 'https://kwoc.kossiitkgp.org';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // KWoC stats API
      try {
        const response = await this.get<any>(
          `${this.baseUrl}/api/stats/${username}`
        );

        if (response) {
          const entries = [{
            date: new Date(),
            problems: response.commits || 0,
            notes: `KWoC: ${response.commits || 0} commits, ${response.pull_requests || 0} PRs`,
          }];

          return this.success(entries, {
            username,
            profileUrl: `${this.baseUrl}/stats/${username}`,
            totalProblems: response.commits,
          });
        }
      } catch {
        // Fall through
      }

      return this.notSupported(
        'KWoC participant not found. Please track contributions manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default KWoCScraper;