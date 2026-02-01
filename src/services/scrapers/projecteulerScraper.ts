// src/services/scrapers/projecteulerScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class ProjectEulerScraper extends BaseScraper {
  platformName = 'Project Euler';
  platformSlug = 'projecteuler';
  protected baseUrl = 'https://projecteuler.net';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Project Euler has a simple public badge/image API
      // But no comprehensive stats API
      try {
        // Check if user exists by trying to load their badge

        const badgeUrl = `${this.baseUrl}/profile/${username}.png`;
        await this.get(badgeUrl);


        // We can only verify existence, not get detailed stats
        return this.notSupported(
          'Project Euler provides limited public data (badge only). Please track your solved problems, level, and awards manually. You can verify your account at: ' +
            badgeUrl
        );

         
      } catch {
        return this.failure(`Project Euler user "${username}" not found`);

      }
    } catch (error) {
      return this.handleError(error);
      
    }
  }
}

export default ProjectEulerScraper;