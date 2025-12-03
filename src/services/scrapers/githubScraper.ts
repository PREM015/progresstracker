// src/services/scrapers/githubScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

interface GitHubCommit {
  sha: string;
  commit: {
    committer: { date: string };
    message: string;
  };
}

export class GitHubScraper extends BaseScraper {
  platformName = 'GitHub';
  platformSlug = 'github';
  protected baseUrl = 'https://api.github.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.token && !credentials.accessToken) {
        return this.failure('GitHub requires authentication. Please connect with OAuth.');
      }

      const token = credentials.token || credentials.accessToken;
      const headers = { Authorization: `Bearer ${token}` };

      // Get user info
      const user = await this.get<any>(`${this.baseUrl}/user`, {}, headers);
      const username = user.login;

      // Get commits from last 90 days
      const { start } = this.getDateRange(90);
      const since = start.toISOString();

      const searchResponse = await this.get<any>(
        `${this.baseUrl}/search/commits`,
        {
          q: `author:${username} committer-date:>=${since}`,
          per_page: 100,
          sort: 'committer-date',
          order: 'desc',
        },
        {
          ...headers,
          Accept: 'application/vnd.github.cloak-preview',
        }
      );

      const commits = searchResponse.items || [];

      // Count commits by date
      const counts = this.countByDate(
        commits,
        (c: any) => this.parseDate(c.commit.committer.date)
      );

      const entries = this.countsToEntries(
        counts,
        (count) => `${count} commit${count > 1 ? 's' : ''} on GitHub`
      );

      // Get contribution stats
      const eventsResponse = await this.get<any>(
        `${this.baseUrl}/users/${username}/events`,
        { per_page: 100 },
        headers
      );

      return this.success(entries, {
        username,
        profileUrl: `https://github.com/${username}`,
        totalProblems: commits.length,
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default GitHubScraper;