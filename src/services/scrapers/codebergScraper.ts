/* eslint-disable @typescript-eslint/no-unused-vars */
// src/services/scrapers/codebergScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface CodebergUser {
  id: number;
  login: string;
  full_name: string;
  avatar_url: string;
}

interface CodebergRepo {
  id: number;
  name: string;
  updated_at: string;
  stars_count: number;
  forks_count: number;
}

export class CodebergScraper extends BaseScraper {
  platformName = 'Codeberg';
  platformSlug = 'codeberg';
  protected baseUrl = 'https://codeberg.org/api/v1';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      const headers: Record<string, string> = {};
      if (credentials.apiKey || credentials.token) {
        headers.Authorization = `token ${credentials.apiKey || credentials.token}`;
      }

      // Get user info
      const user = await this.get<CodebergUser>(`${this.baseUrl}/users/${username}`, {}, headers);

      // Get repositories
      const repos = await this.get<CodebergRepo[]>(
        `${this.baseUrl}/users/${username}/repos`,
        { limit: 50 },
        headers
      );

      const totalStars = repos.reduce((sum, r) => sum + r.stars_count, 0);
      const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0);

      const entries = [
        {
          date: new Date(),
          problems: repos.length,
          notes: `Codeberg: ${repos.length} repos, ${totalStars} stars`,
        },
      ];

      return this.success(entries, {
        username: user.login,
        displayName: user.full_name || user.login,
        profileUrl: `https://codeberg.org/${user.login}`,
        avatarUrl: user.avatar_url,
        totalProblems: repos.length,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default CodebergScraper;