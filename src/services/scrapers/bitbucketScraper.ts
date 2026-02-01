// src/services/scrapers/bitbucketScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface BitbucketUser {
  username: string;
  display_name: string;
  uuid: string;
  links: {
    avatar: { href: string };
    html: { href: string };
  };
}

interface BitbucketReposResponse {
  size: number;
  values: Array<{
    slug: string;
    name: string;
    updated_on: string;
  }>;
}

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
      const user = await this.get<BitbucketUser>(`${this.baseUrl}/user`, {}, headers);

      // Get repositories
      const repos = await this.get<BitbucketReposResponse>(
        `${this.baseUrl}/repositories/${user.username}`,
        { pagelen: 50 },
        headers
      );

      const repoCount = repos.size || repos.values?.length || 0;

      const entries = [
        {
          date: new Date(),
          problems: repoCount,
          notes: `Bitbucket: ${repoCount} repositories`,
        },
      ];

      return this.success(entries, {
        username: user.username,
        displayName: user.display_name,
        profileUrl: user.links.html.href,
        avatarUrl: user.links.avatar.href,
        totalProblems: repoCount,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default BitbucketScraper;