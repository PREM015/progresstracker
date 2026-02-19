// src/services/scrapers/githubScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult, ScraperEntry } from './types';
import { logger } from '@/lib/logger';

interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

interface GitHubCommitSearchResult {
  total_count: number;
  items: Array<{
    sha: string;
    commit: {
      committer: { date: string };
      message: string;
    };
    repository: {
      full_name: string;
    };
  }>;
}

interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  payload: {
    commits?: Array<{ sha: string }>;
    action?: string;
    size?: number;
  };
}

export class GitHubScraper extends BaseScraper {
  platformName = 'GitHub';
  platformSlug = 'github';
  protected baseUrl = 'https://api.github.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      const token = credentials.token || credentials.accessToken;
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let username = credentials.username;
      let user: GitHubUser;

      if (token) {
        // Get authenticated user info
        user = await this.get<GitHubUser>(`${this.baseUrl}/user`, {}, headers);
        username = user.login;
      } else if (username) {
        // Get public user info
        user = await this.get<GitHubUser>(`${this.baseUrl}/users/${username}`, {}, headers);
      } else {
        return this.failure('GitHub requires either an OAuth token or a username.');
      }

      // Get events (contributions) - public events or authenticated events
      const events = await this.get<GitHubEvent[]>(
        `${this.baseUrl}/users/${username}/events`,
        { per_page: 100 },
        headers
      );

      // ✅ Use GitHubCommitSearchResult (feature: last commit message)
      // Note: Search API can work without auth but rate limit is very low
      let lastCommitMessage = null;
      try {
        const commitSearch = await this.get<GitHubCommitSearchResult>(
          `${this.baseUrl}/search/commits`,
          { q: `author:${username}`, per_page: 1 },
          { ...headers, Accept: 'application/vnd.github.cloak-preview+json' }
        );
        lastCommitMessage = commitSearch.items?.[0]?.commit?.message || null;
      } catch (e) {
        logger.debug(`GitHub commit search failed for ${username} (likely rate limited or no auth)`);
      }

      // Count contributions by date
      const contributionMap = new Map<string, { commits: number; prs: number; issues: number }>();

      for (const event of events) {
        const dateStr = this.toDateString(this.parseDate(event.created_at));
        const current = contributionMap.get(dateStr) || { commits: 0, prs: 0, issues: 0 };

        switch (event.type) {
          case 'PushEvent':
            current.commits += event.payload.commits?.length || event.payload.size || 1;
            break;
          case 'PullRequestEvent':
            if (event.payload.action === 'opened') {
              current.prs += 1;
            }
            break;
          case 'IssuesEvent':
            if (event.payload.action === 'opened') {
              current.issues += 1;
            }
            break;
        }

        contributionMap.set(dateStr, current);
      }

      // Convert to entries
      const entries: ScraperEntry[] = Array.from(contributionMap.entries()).map(
        ([dateStr, data]) => ({
          date: new Date(dateStr),
          commits: data.commits,
          pullRequests: data.prs,
          issues: data.issues,
          problems: data.commits + data.prs + data.issues,
          notes: `GitHub: ${data.commits} commits, ${data.prs} PRs, ${data.issues} issues`,
        })
      );

      // Try to get total contributions via GraphQL (if token has scopes)
      let totalContributions = 0;
      try {
        const query = `
          query($username: String!) {
            user(login: $username) {
              contributionsCollection {
                contributionCalendar {
                  totalContributions
                }
              }
            }
          }
        `;
        const data = await this.graphql<any>(
          'https://api.github.com/graphql',
          query,
          { username },
          { Authorization: `Bearer ${token}` }
        );
        totalContributions = data?.user?.contributionsCollection?.contributionCalendar?.totalContributions || 0;
      } catch (e) {
        // Fallback to sum of events if GraphQL fails
        totalContributions = entries.reduce((sum, e) => sum + (e.commits || 0) + (e.pullRequests || 0) + (e.issues || 0), 0);
      }

      // Calculate totals
      const totalCommits = entries.reduce((sum, e) => sum + (e.commits || 0), 0);
      const totalPRs = entries.reduce((sum, e) => sum + (e.pullRequests || 0), 0);

      return this.success(entries, {
        username,
        displayName: user.name || username,
        profileUrl: user.html_url,
        avatarUrl: user.avatar_url,
        totalCommits: totalContributions > 0 ? totalContributions : totalCommits, // Use total contributions if available
        totalProblems: totalContributions > 0 ? totalContributions : totalCommits,
        totalPRs,
        lastCommitMessage,

        followers: user.followers,
        following: user.following,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default GitHubScraper;