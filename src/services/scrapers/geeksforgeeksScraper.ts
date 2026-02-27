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

      let totalSolved = 0;
      let institutionRank;
      let streak;
      let longestStreak;

      try {
        // Use unofficial API
        const response = await this.get<GFGStats>(
          `https://geeks-for-geeks-stats-api.vercel.app/?userName=${username}`
        );

        if (response && !response.error) {
          const easy = response.solvedStats?.easy?.count || 0;
          const medium = response.solvedStats?.medium?.count || 0;
          const hard = response.solvedStats?.hard?.count || 0;
          totalSolved = easy + medium + hard;
          institutionRank = response.institutionRank;
          streak = response.currentStreak;
          longestStreak = response.maxStreak;
        } else {
          throw new Error('GFG API returned error or no data');
        }
      } catch (apiError) {
        console.warn('GFG API failed, falling back to HTML scraping:', apiError);
        const htmlResponse = await this.request(`${this.baseUrl}/user/${username}/`, { method: 'GET' });
        const html = htmlResponse.data as string;

        // Simple regex fallback
        const solvedMatch = html.match(/class=".*?score_cards_container.*?".*?class=".*?score_card_value.*?">(\d+)</i) ||
          html.match(/Problems Solved.*?(\d+)/i);
        totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0;

        const rankMatch = html.match(/Institute Rank.*?(\d+)/i);
        institutionRank = rankMatch ? parseInt(rankMatch[1], 10) : undefined;
      }

      // GFG API doesn't provide date-wise data
      const entries =
        totalSolved > 0
          ? [
            {
              date: new Date(),
              problems: 0,
              notes: `Total solved on GFG: ${totalSolved}`,
            },
          ]
          : [];

      return this.success(entries, {
        username,
        profileUrl: `${this.baseUrl}/user/${username}`,
        totalProblems: totalSolved,
        rank: institutionRank?.toString(),
        streak: streak,
        longestStreak: longestStreak,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default GeeksforGeeksScraper;