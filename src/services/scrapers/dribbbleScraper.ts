// src/services/scrapers/dribbbleScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface DribbbleUser {
  login: string;
  name: string;
  html_url: string;
  avatar_url: string;
  shots_count: number;
  followers_count: number;
}

interface DribbbleShot {
  id: number;
  title: string;
  created_at: string;
}

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
      const user = await this.get<DribbbleUser>(`${this.baseUrl}/user`, {}, headers);
      const shots = await this.get<DribbbleShot[]>(
        `${this.baseUrl}/user/shots`,
        { per_page: 50 },
        headers
      );

      const entries = shots.map((shot) => ({
        date: this.parseDate(shot.created_at),
        problems: 1,
        notes: `Published shot: ${shot.title}`,
      }));

      return this.success(entries, {
        username: user.login,
        displayName: user.name,
        profileUrl: user.html_url,
        avatarUrl: user.avatar_url,
        totalProblems: user.shots_count,
        followers: user.followers_count,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default DribbbleScraper;