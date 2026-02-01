// src/services/scrapers/gssocScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface GSSoCLeaderboardUser {
  github_username?: string;
  pr_count?: number;
  points?: number;
  rank?: number;
}

export class GSSoCScraper extends BaseScraper {
  platformName = 'GSSoC';
  platformSlug = 'gssoc';
  protected baseUrl = 'https://gssoc.girlscript.tech';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      try {
        const response = await this.get<GSSoCLeaderboardUser[]>(`${this.baseUrl}/api/leaderboard`);

        const user = response?.find?.(
          (u) => u.github_username?.toLowerCase() === username.toLowerCase()
        );

        if (user) {
          const entries = [
            {
              date: new Date(),
              problems: user.pr_count || 0,
              xp: user.points,
              


              

               
              points: user.points,
              
              notes: `GSSoC: ${user.pr_count || 0} PRs merged, ${user.points || 0} points, Rank: ${user.rank || 'N/A'}`,
              

            },
          ];

          return this.success(entries, {
            username,
            profileUrl: `https://github.com/${username}`,
            totalProblems: user.pr_count,
            points: user.points,
            
            rank: user.rank?.toString(),
            displayName: user.github_username,

          });
        }
      } catch (error) {
        console.error('Error fetching GSSoC data:', error);
      }

      return this.notSupported('GSSoC participant not found. Please track contributions manually.');
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default GSSoCScraper;