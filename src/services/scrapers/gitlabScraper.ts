// src/services/scrapers/gitlabScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class GitLabScraper extends BaseScraper {
  platformName = 'GitLab';
  platformSlug = 'gitlab';
  protected baseUrl = 'https://gitlab.com/api/v4';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.token && !credentials.accessToken) {
        return this.failure('GitLab requires authentication.');
      }

      const token = credentials.token || credentials.accessToken;
      const headers = { 'PRIVATE-TOKEN': token };

      // Get user info
      const user = await this.get<any>(`${this.baseUrl}/user`, {}, headers);
      const userId = user.id;

      // Get user events (contributions)
      const { start } = this.getDateRange(90);
      const events = await this.get<any>(
        `${this.baseUrl}/users/${userId}/events`,
        {
          after: start.toISOString().split('T')[0],
          per_page: 100,
        },
        headers
      );

      // Filter push events (commits)
      const pushEvents = events.filter((e: any) => e.action_name === 'pushed to');

      const counts = this.countByDate(
        pushEvents,
        (e: any) => this.parseDate(e.created_at)
      );

      const entries = this.countsToEntries(
        counts,
        (count) => `${count} push${count > 1 ? 'es' : ''} on GitLab`
      );

      return this.success(entries, {
        username: user.username,
        profileUrl: `https://gitlab.com/${user.username}`,
        totalProblems: pushEvents.length,
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default GitLabScraper;