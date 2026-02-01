// src/services/scrapers/geeksforgeeksScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface GFGStats {
  userName: string;
  solvedStats?: {
    easy?: { count: number };
    medium?: { count: number };
    hard?: { count: number };
  };
  currentStreak?: number;
  maxStreak?: number;
  institutionRank?: number;
  languagesUsed?: string[];
  error?: string;
}

export class GeeksforGeeksScraper extends BaseScraper {
  platformName = 'GeeksforGeeks';
  platformSlug = 'geeksforgeeks';
  protected baseUrl = 'https://www.geeksforgeeks.org';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Use unofficial API
      const response = await this.get<GFGStats>(
        `https://geeks-for-geeks-stats-api.vercel.app/?userName=${username}`
      );

      if (!response || response.error) {
        return this.failure(response?.error || `GFG user "${username}" not found`);
      }

      const easy = response.solvedStats?.easy?.count || 0;
      const medium = response.solvedStats?.medium?.count || 0;
      const hard = response.solvedStats?.hard?.count || 0;
      const totalSolved = easy + medium + hard;

      // GFG API doesn't provide date-wise data
      const entries =
        totalSolved > 0
          ? [
              {
                date: new Date(),
                problems: totalSolved,
                notes: `Total solved on GFG: ${totalSolved} (Easy: ${easy}, Medium: ${medium}, Hard: ${hard})`,
              },
            ]
          : [];

      return this.success(entries, {
        username,
        profileUrl: `${this.baseUrl}/user/${username}`,
        totalProblems: totalSolved,
        rank: response.institutionRank?.toString(),
        streak: response.currentStreak,
        longestStreak: response.maxStreak,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default GeeksforGeeksScraper;