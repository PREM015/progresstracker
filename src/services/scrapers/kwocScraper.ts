/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/scrapers/kwocScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface KWoCStats {
  commits?: number;
  pull_requests?: number;
  lines_added?: number;
  lines_removed?: number;
}

export class KWoCScraper extends BaseScraper {
  platformName = 'KWoC';
  platformSlug = 'kwoc';
  protected baseUrl = 'https://kwoc.kossiitkgp.org';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      try {
        const response = await this.get<KWoCStats>(`${this.baseUrl}/api/stats/${username}`);

        if (response) {
          const entries = [
            {
              date: new Date(),
              problems: response.commits || 0,
              commits: response.commits,
              pullRequests: response.pull_requests,
              notes: `KWoC: ${response.commits || 0} commits, ${response.pull_requests || 0} PRs`,
            },
          ];

          return this.success(entries, {
            username,
            profileUrl: `${this.baseUrl}/stats/${username}`,
            totalProblems: response.commits,
            totalCommits: response.commits,
          });
        }
      } catch (error: any) {
        console.error('Error fetching KWoC data:', error);
      }

      return this.notSupported('KWoC participant not found. Please track contributions manually.');
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default KWoCScraper;