// src/services/scrapers/unstopScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class UnstopScraper extends BaseScraper {
  platformName = 'Unstop';
  platformSlug = 'unstop';
  protected baseUrl = 'https://unstop.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Unstop (D2C) API
      try {
        const response = await this.get<any>(
          `${this.baseUrl}/api/public/user/${username}/profile`
        );

        if (response && response.data) {
          const data = response.data;
          const entries = [{
            date: new Date(),
            problems: data.competitions_participated || 0,
            notes: `Unstop: ${data.competitions_participated || 0} competitions, XP: ${data.xp_points || 0}`,
          }];

          return this.success(entries, {
            username,
            profileUrl: `${this.baseUrl}/u/${username}`,
            totalProblems: data.competitions_participated,
          });
        }
      } catch {
        // Fall through
      }

      return this.notSupported(
        'Unstop profile data may require login. Please track manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default UnstopScraper;