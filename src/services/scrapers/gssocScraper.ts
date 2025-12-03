// src/services/scrapers/gssocScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class GSSoCScraper extends BaseScraper {
  platformName = 'GSSoC';
  platformSlug = 'gssoc';
  protected baseUrl = 'https://gssoc.girlscript.tech';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // GSSoC leaderboard API
      try {
        const response = await this.get<any>(
          `${this.baseUrl}/api/leaderboard`
        );

        const user = response.find?.((u: any) => 
          u.github_username?.toLowerCase() === username.toLowerCase()
        );

        if (user) {
          const entries = [{
            date: new Date(),
            problems: user.pr_count || 0,
            notes: `GSSoC: ${user.pr_count || 0} PRs merged, ${user.points || 0} points, Rank: ${user.rank || 'N/A'}`,
          }];

          return this.success(entries, {
            username,
            profileUrl: `https://github.com/${username}`,
            totalProblems: user.pr_count,
            rank: user.rank?.toString(),
          });
        }
      } catch {
        // Fall through
      }

      return this.notSupported(
        'GSSoC participant not found. Please track contributions manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default GSSoCScraper;