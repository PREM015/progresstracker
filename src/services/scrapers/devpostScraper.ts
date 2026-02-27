// src/services/scrapers/devpostScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class DevpostScraper extends BaseScraper {
  platformName = 'Devpost';
  platformSlug = 'devpost';
  protected baseUrl = 'https://devpost.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Try unofficial API
      try {
        const response = await this.get<{
          projects?: Array<{
            name: string;
            submittedAt?: string;
            createdAt?: string;
            hackathon?: string;
          }>;
          error?: string;
        }>(`https://devpost-api.vercel.app/user/${username}`);

        if (response && !response.error && response.projects) {
          const entries = response.projects.map((project) => ({
            date: this.parseDate(project.submittedAt || project.createdAt || new Date()),
            problems: 1,
            notes: `Submitted project: ${project.name} to ${project.hackathon || 'Devpost'}`,
          }));

          return this.success(entries, {
            username,
            profileUrl: `${this.baseUrl}/${username}`,
            totalProblems: response.projects.length,
          });
        }
      } catch {
        // Fall through
      }

      return this.notSupported(
        'Devpost requires web scraping. Please track hackathon projects manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default DevpostScraper;