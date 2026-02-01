// src/services/scrapers/gitlabScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult, ScraperEntry } from './types';

interface GitLabUser {
  id: number;
  username: string;
  name: string;
  avatar_url: string;
  web_url: string;
}

interface GitLabEvent {
  id: number;
  action_name: string;
  created_at: string;
  push_data?: {
    commit_count: number;
  };
}

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
      const headers = { 'PRIVATE-TOKEN': token ?? '' };


      // Get user info
      const user = await this.get<GitLabUser>(`${this.baseUrl}/user`, {}, headers);
      const userId = user.id;

      // Get user events (contributions)
      const { start } = this.getDateRange(90);
      const events = await this.get<GitLabEvent[]>(
        `${this.baseUrl}/users/${userId}/events`,
        {
          after: start.toISOString().split('T')[0],
          per_page: 100,
        },
        headers
      );

      // Count by date
      const contributionMap = new Map<string, number>();

      for (const event of events) {
        const dateStr = this.toDateString(this.parseDate(event.created_at));
        const current = contributionMap.get(dateStr) || 0;

        if (event.action_name === 'pushed to' || event.action_name === 'pushed new') {
          contributionMap.set(dateStr, current + (event.push_data?.commit_count || 1));
        } else if (
          event.action_name === 'opened' ||
          event.action_name === 'created' ||
          event.action_name === 'accepted'
        ) {
          contributionMap.set(dateStr, current + 1);
        }
      }

      const entries: ScraperEntry[] = Array.from(contributionMap.entries()).map(
        ([dateStr, count]) => ({
          date: new Date(dateStr),
          commits: count,
          problems: count,
          notes: `${count} contribution${count > 1 ? 's' : ''} on GitLab`,
        })
      );

      const totalCommits = entries.reduce((sum, e) => sum + (e.commits || 0), 0);

      return this.success(entries, {
        username: user.username,
        displayName: user.name,
        profileUrl: user.web_url,
        avatarUrl: user.avatar_url,
        totalCommits,
        totalProblems: totalCommits,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default GitLabScraper;