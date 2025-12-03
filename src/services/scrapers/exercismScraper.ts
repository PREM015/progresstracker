// src/services/scrapers/exercismScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class ExercismScraper extends BaseScraper {
  platformName = 'Exercism';
  platformSlug = 'exercism';
  protected baseUrl = 'https://exercism.org/api/v2';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Get profile
      const profileResponse = await this.get<any>(
        `${this.baseUrl}/profiles/${username}`
      );

      const profile = profileResponse.profile;

      // Get solutions
      const solutionsResponse = await this.get<any>(
        `${this.baseUrl}/profiles/${username}/solutions`
      );

      const solutions = solutionsResponse.results || [];

      // Group by date
      const counts = this.countByDate(
        solutions.filter((s: any) => s.published_at || s.completed_at),
        (s: any) => this.parseDate(s.published_at || s.completed_at),
        (s: any) => s.uuid
      );

      const entries = this.countsToEntries(
        counts,
        (count) => `Completed ${count} exercise${count > 1 ? 's' : ''} on Exercism`
      );

      return this.success(entries, {
        username,
        profileUrl: `https://exercism.org/profiles/${username}`,
        totalProblems: solutions.length,
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default ExercismScraper;