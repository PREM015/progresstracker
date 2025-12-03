// src/services/scrapers/codechefScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class CodeChefScraper extends BaseScraper {
  platformName = 'CodeChef';
  platformSlug = 'codechef';
  protected baseUrl = 'https://www.codechef.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // CodeChef has unofficial API endpoints
      const response = await this.get<any>(
        `${this.baseUrl}/users/${username}`,
        {},
        { Accept: 'application/json' }
      );

      // Try to parse from page or use unofficial API
      // This is a placeholder - CodeChef requires web scraping
      
      return this.notSupported(
        'CodeChef auto-sync requires web scraping. Please use manual tracking or wait for Puppeteer implementation.'
      );
    } catch (error: any) {
      // Try unofficial API
      try {
        const apiResponse = await this.get<any>(
          `https://codechef-api.vercel.app/handle/${credentials.username}`
        );

        if (apiResponse && apiResponse.success !== false) {
          const entries = [{
            date: new Date(),
            problems: apiResponse.fullySolved?.count || 0,
            notes: `Total problems solved on CodeChef: ${apiResponse.fullySolved?.count || 0}`,
          }];

          return this.success(entries, {
            username: credentials.username,
            profileUrl: `${this.baseUrl}/users/${credentials.username}`,
            rating: apiResponse.currentRating,
            rank: apiResponse.stars,
          });
        }
      } catch {
        // Fall through to error
      }

      return this.handleError(error);
    }
  }
}

export default CodeChefScraper;