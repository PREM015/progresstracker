// src/services/scrapers/codinGameScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface CodinGamerResponse {
  codingamer?: {
    level?: number;
    xp?: number;
    achievementCount?: number;
    publicHandle?: string;
    rank?: number;
  };
}

export class CodinGameScraper extends BaseScraper {
  platformName = 'CodinGame';
  platformSlug = 'codingame';
  protected baseUrl = 'https://www.codingame.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // CodinGame public API
      const response = await this.post<CodinGamerResponse>(
        `${this.baseUrl}/services/CodinGamer/findCodinGamerPublicInformations`,
        [username]
      );

      if (response?.codingamer) {
        const codingamer = response.codingamer;

        const entries = [
          {
            date: new Date(),
            problems: codingamer.achievementCount || 0,
            xp: codingamer.xp,
            notes: `CodinGame: Level ${codingamer.level || 0}, XP: ${codingamer.xp || 0}`,
          },
        ];

        return this.success(entries, {
          username,
          profileUrl: `${this.baseUrl}/profile/${codingamer.publicHandle}`,
          totalProblems: codingamer.achievementCount,
          level: codingamer.level,
          xp: codingamer.xp,
          rank: codingamer.rank?.toString(),
        });
      }

      return this.failure(`CodinGame user "${username}" not found`);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default CodinGameScraper;