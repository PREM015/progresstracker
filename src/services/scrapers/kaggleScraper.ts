// src/services/scrapers/kaggleScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class KaggleScraper extends BaseScraper {
  platformName = 'Kaggle';
  platformSlug = 'kaggle';
  protected baseUrl = 'https://www.kaggle.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Kaggle public profile JSON
      const response = await this.get<any>(
        `${this.baseUrl}/${username}.json`,
        {},
        { 'User-Agent': 'Mozilla/5.0' }
      );

      const competitions = response.competitions || [];
      const notebooks = response.notebooks || [];
      const datasets = response.datasets || [];

      const entries: any[] = [];

      // Competition entries
      competitions.forEach((comp: any) => {
        if (comp.enrolledOn) {
          entries.push({
            date: this.parseDate(comp.enrolledOn),
            problems: 1,
            notes: `Joined competition: ${comp.competitionName}`,
          });
        }
      });

      // Notebook entries
      notebooks.slice(0, 20).forEach((nb: any) => {
        if (nb.creationDate) {
          entries.push({
            date: this.parseDate(nb.creationDate),
            problems: 1,
            notes: `Created notebook: ${nb.title}`,
          });
        }
      });

      return this.success(entries, {
        username,
        profileUrl: `${this.baseUrl}/${username}`,
        totalProblems: competitions.length + notebooks.length + datasets.length,
        rank: response.tier,
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default KaggleScraper;