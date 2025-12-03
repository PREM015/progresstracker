// src/services/scrapers/datacampScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class DataCampScraper extends BaseScraper {
  platformName = 'DataCamp';
  platformSlug = 'datacamp';
  protected baseUrl = 'https://www.datacamp.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // DataCamp public profile
      try {
        const response = await this.get<any>(
          `${this.baseUrl}/portfolio/${username}`
        );

        // Would need to parse HTML
        return this.notSupported(
          'DataCamp requires web scraping. Please track XP and courses manually.'
        );
      } catch {
        return this.failure(`DataCamp user "${username}" not found`);
      }
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default DataCampScraper;