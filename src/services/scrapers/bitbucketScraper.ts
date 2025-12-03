// src/services/scrapers/bitbucketScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class BitbucketScraper extends BaseScraper {
  platformName = 'Bitbucket';
  platformSlug = 'bitbucket';
  protected baseUrl = 'https://api.bitbucket.org/2.0';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.token && !credentials.accessToken) {
        return this.failure('Bitbucket requires authentication.');
      }

      const token = credentials.token || credentials.accessToken;
      const headers = { Authorization: `Bearer ${token}` };

      // Get user info
      const user = await this.get<any>(`${this.baseUrl}/user`, {}, headers);

      // Get repositories
      const repos = await this.get<any>(
        `${this.baseUrl}/repositories/${user.username}`,
        { pagelen: 50 },
        headers
      );

      const entries = [{
        date: new Date(),
        problems: repos.size || repos.values?.length || 0,
        notes: `Bitbucket: ${repos.size || repos.values?.length || 0} repositories`,
      }];

      return this.success(entries, {
        username: user.username,
        profileUrl: `https://bitbucket.org/${user.username}`,
        totalProblems: repos.size || 0,
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default BitbucketScraper;