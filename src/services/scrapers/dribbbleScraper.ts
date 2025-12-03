// src/services/scrapers/dribbbleScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class DribbbleScraper extends BaseScraper {
  platformName = 'Dribbble';
  platformSlug = 'dribbble';
  protected baseUrl = 'https://api.dribbble.com/v2';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.accessToken) {
        return this.failure('Dribbble requires OAuth authentication.');
      }

      const headers = { Authorization: `Bearer ${credentials.accessToken}` };
      const user = await this.get<any>(`${this.baseUrl}/user`, {}, headers);
      const shots = await this.get<any>(`${this.baseUrl}/user/shots`, { per_page: 50 }, headers);

      const entries = shots.map((shot: any) => ({
        date: this.parseDate(shot.created_at),
        problems: 1,
        notes: `Published shot: ${shot.title}`,
      }));

      return this.success(entries, {
        username: user.login,
        profileUrl: user.html_url,
        totalProblems: user.shots_count,
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default DribbbleScraper;