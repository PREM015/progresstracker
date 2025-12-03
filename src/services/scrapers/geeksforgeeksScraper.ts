// src/services/scrapers/geeksforgeeksScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class GeeksforGeeksScraper extends BaseScraper {
  platformName = 'GeeksforGeeks';
  platformSlug = 'geeksforgeeks';
  protected baseUrl = 'https://www.geeksforgeeks.org';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Use unofficial API
      const response = await this.get<any>(
        `https://geeks-for-geeks-stats-api.vercel.app/?userName=${username}`
      );

      if (!response || response.error) {
        return this.failure(response?.error || `GFG user "${username}" not found`);
      }

      const totalSolved =
        (response.solvedStats?.easy?.count || 0) +
        (response.solvedStats?.medium?.count || 0) +
        (response.solvedStats?.hard?.count || 0);

      // GFG API doesn't provide date-wise data
      const entries = totalSolved > 0
        ? [{
            date: new Date(),
            problems: totalSolved,
            notes: `Total solved on GFG: ${totalSolved} (Easy: ${response.solvedStats?.easy?.count || 0}, Medium: ${response.solvedStats?.medium?.count || 0}, Hard: ${response.solvedStats?.hard?.count || 0})`,
          }]
        : [];

      return this.success(entries, {
        username,
        profileUrl: `${this.baseUrl}/user/${username}`,
        totalProblems: totalSolved,
        rank: response.institutionRank?.toString(),
        streak: response.currentStreak,
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default GeeksforGeeksScraper;