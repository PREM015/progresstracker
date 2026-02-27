// src/services/scrapers/skillshareScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class SkillshareScraper extends BaseScraper {
  platformName = 'Skillshare';
  platformSlug = 'skillshare';
  protected baseUrl = 'https://www.skillshare.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);

      // Skillshare doesn't have a public API
      return this.notSupported(
        'Skillshare does not provide public API access. Please track your completed classes, projects created, and watch time manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default SkillshareScraper;