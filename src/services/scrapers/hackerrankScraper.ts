// src/services/scrapers/hackerrankScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class HackerRankScraper extends BaseScraper {
  platformName = 'HackerRank';
  platformSlug = 'hackerrank';
  protected baseUrl = 'https://www.hackerrank.com/rest';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // HackerRank has some public API endpoints
      const profileResponse = await this.get<any>(
        `${this.baseUrl}/hackers/${username}/scores_elo`
      );

      const submissionsResponse = await this.get<any>(
        `${this.baseUrl}/hackers/${username}/recent_challenges`,
        { limit: 100 }
      );

      const submissions = submissionsResponse?.models || [];

      // Group by date
      const counts = this.countByDate(
        submissions,
        (s: any) => this.parseDate(s.created_at || s.updated_at),
        (s: any) => s.slug
      );

      const entries = this.countsToEntries(
        counts,
        (count) => `Completed ${count} challenge${count > 1 ? 's' : ''} on HackerRank`
      );

      return this.success(entries, {
        username,
        profileUrl: `https://www.hackerrank.com/profile/${username}`,
        totalProblems: submissions.length,
      });
    } catch (error: any) {
      // HackerRank might block API requests
      return this.notSupported(
        'HackerRank requires authentication for full data access. Please use manual tracking.'
      );
    }
  }
}

export default HackerRankScraper;