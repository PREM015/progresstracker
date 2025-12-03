// src/services/scrapers/devpostScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class DevpostScraper extends BaseScraper {
  platformName = 'Devpost';
  platformSlug = 'devpost';
  protected baseUrl = 'https://devpost.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Devpost has a public portfolio page
      // Need to scrape HTML or use unofficial API
      try {
        const response = await this.get<any>(
          `https://devpost-api.vercel.app/user/${username}`
        );

        if (response && !response.error) {
          const entries = response.projects?.map((project: any) => ({
            date: this.parseDate(project.submittedAt || project.createdAt),
            problems: 1,
            notes: `Submitted project: ${project.name} to ${project.hackathon || 'Devpost'}`,
          })) || [];

          return this.success(entries, {
            username,
            profileUrl: `${this.baseUrl}/${username}`,
            totalProblems: response.projects?.length || 0,
          });
        }
      } catch {
        // Fall through
      }

      return this.notSupported(
        'Devpost requires web scraping. Please track hackathon projects manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default DevpostScraper;