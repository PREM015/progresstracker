// src/services/scrapers/hackerrankScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface HackerRankSubmission {
  slug: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface HackerRankResponse {
  models: HackerRankSubmission[];
  total: number;
}

export class HackerRankScraper extends BaseScraper {
  platformName = 'HackerRank';
  platformSlug = 'hackerrank';
  protected baseUrl = 'https://www.hackerrank.com/rest';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Try to fetch recent challenges
      try {
        const response = await this.get<HackerRankResponse>(
          `${this.baseUrl}/hackers/${username}/recent_challenges`,
          { limit: 100 }
        );

        const submissions = response?.models || [];

        if (submissions.length === 0) {
          return this.success([], {
            username,
            profileUrl: `https://www.hackerrank.com/profile/${username}`,
            totalProblems: 0,
          });
        }

        // Group by date
        const counts = this.countByDate(
          submissions,
          (s) => this.parseDate(s.created_at || s.updated_at),
          (s) => s.slug
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
      } catch {
        // HackerRank might block API requests without auth
        return this.notSupported(
          'HackerRank requires authentication for full data access. Please use manual tracking.'
        );
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default HackerRankScraper;