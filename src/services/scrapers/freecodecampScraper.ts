// src/services/scrapers/freecodecampScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult, ScraperEntry } from './types';

interface FreeCodeCampUser {
  entities?: {
    user?: {
      [username: string]: {
        name: string;
        username: string;
        points: number;
        calendar: Record<string, number>;
        streak?: { current: number; longest: number };
        completedChallenges?: Array<{ completedDate: number }>;
      };
    };
  };
}

export class FreeCodeCampScraper extends BaseScraper {
  platformName = 'freeCodeCamp';
  platformSlug = 'freecodecamp';
  protected baseUrl = 'https://api.freecodecamp.org';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      const response = await this.get<FreeCodeCampUser>(
        `${this.baseUrl}/api/users/get-public-profile`,
        { username }
      );

      if (!response?.entities?.user) {
        return this.failure(`freeCodeCamp user "${username}" not found`);
      }

      const user = response.entities.user[username];
      if (!user) {
        return this.failure(`freeCodeCamp user "${username}" not found`);
      }

      const calendar = user.calendar || {};

      // Convert calendar to entries
      const entries: ScraperEntry[] = Object.entries(calendar)
        .filter(([, count]) => count > 0)
        .map(([timestamp, count]) => ({
          date: this.parseDate(parseInt(timestamp)),
          problems: count,
          notes: `${count} challenge${count > 1 ? 's' : ''} on freeCodeCamp`,
        }));

      return this.success(entries, {
        username,
        displayName: user.name || username,
        profileUrl: `https://www.freecodecamp.org/${username}`,
        totalProblems: user.points || 0,
        points: user.points,
        streak: user.streak?.current || 0,
        longestStreak: user.streak?.longest,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default FreeCodeCampScraper;