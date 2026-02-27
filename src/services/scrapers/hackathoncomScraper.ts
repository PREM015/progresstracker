// src/services/scrapers/hackathonScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

/**
 * Generic hackathon tracking scraper
 * Used as a base/fallback for hackathon platforms
 */
export class HackathonScraper extends BaseScraper {
  platformName = 'Hackathon';
  platformSlug = 'hackathon';
  protected baseUrl = '';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('Hackathon requires a username for tracking.');
    }else if (!credentials.password) {
      return this.failure('Hackathon requires a password for tracking.');
    }


    try {
      
      return this.notSupported(

        'Generic hackathon tracking is not available for auto-sync. Please use specific platform integrations (Devpost, Devfolio, MLH) or track hackathon participation manually.'

      );


       
      
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default HackathonScraper;