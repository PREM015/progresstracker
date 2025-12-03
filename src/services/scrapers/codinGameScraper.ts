// src/services/scrapers/codinGameScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class CodinGameScraper extends BaseScraper {
  platformName = 'CodinGame';
  platformSlug = 'codingame';
  protected baseUrl = 'https://www.codingame.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // CodinGame public API
      const response = await this.post<any>(
        `${this.baseUrl}/services/CodinGamer/findCodinGamerPublicInformations`,
        [username]
      );

      if (response && response.codingamer) {
        const codingamer = response.codingamer;

        const entries = [{
          date: new Date(),
          problems: codingamer.achievementCount || 0,
          notes: `CodinGame: Level ${codingamer.level || 0}, XP: ${codingamer.xp || 0}`,
        }];

        return this.success(entries, {
          username,
          profileUrl: `${this.baseUrl}/profile/${codingamer.publicHandle}`,
          totalProblems: codingamer.achievementCount,
          rank: codingamer.rank?.toString(),
        });
      }

      return this.failure(`CodinGame user "${username}" not found`);
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default CodinGameScraper;