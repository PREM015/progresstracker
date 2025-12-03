// src/services/scrapers/freecodecampScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class FreeCodeCampScraper extends BaseScraper {
  platformName = 'freeCodeCamp';
  platformSlug = 'freecodecamp';
  protected baseUrl = 'https://api.freecodecamp.org';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // freeCodeCamp public API
      const response = await this.get<any>(
        `${this.baseUrl}/api/users/get-public-profile`,
        { username }
      );

      if (response && response.entities && response.entities.user) {
        const user = response.entities.user[username];
        const calendar = user.calendar || {};

        // Convert calendar to entries
        const entries = Object.entries(calendar).map(([timestamp, count]) => ({
          date: this.parseDate(parseInt(timestamp)),
          problems: count as number,
          notes: `${count} challenge${(count as number) > 1 ? 's' : ''} on freeCodeCamp`,
        }));

        return this.success(entries, {
          username,
          profileUrl: `https://www.freecodecamp.org/${username}`,
          totalProblems: user.points || 0,
          streak: user.streak?.current || 0,
        });
      }

      return this.failure(`freeCodeCamp user "${username}" not found`);
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default FreeCodeCampScraper;