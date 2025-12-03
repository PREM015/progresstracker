// src/services/scrapers/devfolioScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class DevfolioScraper extends BaseScraper {
  platformName = 'Devfolio';
  platformSlug = 'devfolio';
  protected baseUrl = 'https://devfolio.co';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Devfolio API
      try {
        const response = await this.get<any>(
          `https://api.devfolio.co/api/users/${username}`
        );

        if (response && response.user) {
          const user = response.user;
          const hackathons = user.hackathons || [];

          const entries = hackathons.map((h: any) => ({
            date: this.parseDate(h.start_time || new Date()),
            problems: 1,
            notes: `Participated in ${h.name}`,
          }));

          return this.success(entries, {
            username,
            profileUrl: `${this.baseUrl}/@${username}`,
            totalProblems: hackathons.length,
          });
        }
      } catch {
        // Fall through
      }

      return this.notSupported(
        'Devfolio API access may be limited. Please track hackathons manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default DevfolioScraper;