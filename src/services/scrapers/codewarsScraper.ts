// src/services/scrapers/codewarsScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

interface CodewarsUser {
  username: string;
  honor: number;
  ranks: {
    overall: { name: string; score: number };
    languages: Record<string, { name: string; score: number }>;
  };
  codeChallenges: {
    totalCompleted: number;
  };
}

interface CodewarsChallenge {
  id: string;
  name: string;
  slug: string;
  completedAt: string;
}

export class CodewarsScraper extends BaseScraper {
  platformName = 'Codewars';
  platformSlug = 'codewars';
  protected baseUrl = 'https://www.codewars.com/api/v1';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Get user info
      const user = await this.get<CodewarsUser>(
        `${this.baseUrl}/users/${username}`
      );

      // Get completed challenges
      const completedResponse = await this.get<{ data: CodewarsChallenge[] }>(
        `${this.baseUrl}/users/${username}/code-challenges/completed`,
        { page: 0 }
      );

      const challenges = completedResponse.data || [];

      // Group by date
      const counts = this.countByDate(
        challenges.filter((c) => c.completedAt),
        (c) => this.parseDate(c.completedAt),
        (c) => c.id
      );

      const entries = this.countsToEntries(
        counts,
        (count) => `Completed ${count} kata${count > 1 ? 's' : ''} on Codewars`
      );

      return this.success(entries, {
        username,
        profileUrl: `https://www.codewars.com/users/${username}`,
        totalProblems: user.codeChallenges?.totalCompleted || 0,
        rank: user.ranks?.overall?.name,
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default CodewarsScraper;