// src/services/scrapers/devfolioScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface DevfolioUser {
  user?: {
    username: string;
    hackathons?: Array<{
      name: string;
      start_time?: string;
    }>;
  };
}

export class DevfolioScraper extends BaseScraper {
  platformName = 'Devfolio';
  platformSlug = 'devfolio';
  protected baseUrl = 'https://devfolio.co';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      try {
        const response = await this.get<DevfolioUser>(
          `https://api.devfolio.co/api/users/${username}`
          , {},
          { 'User-Agent': 'Mozilla/5.0' }


        );

        if (response?.user) {
          const hackathons = response.user.hackathons || [];


          const entries = hackathons.map((h) => ({
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
        return this.failure(`Devfolio user "${username}" not found`);

      }

      return this.notSupported(
        'Devfolio API access may be limited. Please track hackathons manually.'

      );
    } catch (error) {
      return this.handleError(error);
      
    }
  }
}

export default DevfolioScraper;