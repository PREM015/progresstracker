// src/services/scrapers/unstopScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface UnstopProfile {
  data?: {
    competitions_participated?: number;
    xp_points?: number;
    username?: string;
  };
}

export class UnstopScraper extends BaseScraper {
  platformName = 'Unstop';
  platformSlug = 'unstop';
  protected baseUrl = 'https://unstop.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      // Try unofficial API
      // Most useful data requires special permissions


      try {
        const response = await this.get<UnstopProfile>(

          `${this.baseUrl}/api/public/user/${username}/profile`

        );

        if (response?.data ) {
          const data = response.data;
          const entries = [
            {
              date: new Date(),

              problems: data.competitions_participated || 0,
              notes: `Unstop: ${data.competitions_participated || 0} competitions, XP: ${data.xp_points || 0}`,

            },
          ];
if (entries.length === 0) {
  return this.failure(`Unstop user "${username}" not found`);
}

if (!data.username) {
  return this.failure(`Unstop user "${username}" not found`);
}
if (data.competitions_participated === undefined && data.xp_points === undefined) {
  return this.failure(`Unstop user "${username}" has no participation data`);
}

          return this.success(entries, {
            username,
            profileUrl: `${this.baseUrl}/u/${username}`,
            totalProblems: data.competitions_participated,
            xp: data.xp_points,
            displayName: data.username,

          });
        }
      } catch (error) {
        // Fall through
        console.error(error);


          return this.failure(`Unstop user "${username}" not found`);

          

      }

      return this.notSupported('Unstop profile data may require login. Please track manually.');
    } catch (error) {
      return this.handleError(error);
      
    }
  }
}

export default UnstopScraper;