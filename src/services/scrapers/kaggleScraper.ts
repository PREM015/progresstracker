// src/services/scrapers/kaggleScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult, ScraperEntry } from './types';

interface KaggleProfile {
  displayName?: string;
  userName?: string;
  thumbnailUrl?: string;
  tier?: string;
  competitions?: Array<{
    competitionName: string;
    enrolledOn?: string;
    startTime?: string;
  }>;
  notebooks?: Array<{
    title: string;
    creationDate?: string;
  }>;
  datasets?: Array<{
    title: string;
  }>;
}

export class KaggleScraper extends BaseScraper {
  platformName = 'Kaggle';
  platformSlug = 'kaggle';
  protected baseUrl = 'https://www.kaggle.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Try to get public profile JSON
      try {
        const response = await this.get<KaggleProfile>(
          `${this.baseUrl}/${username}.json`,
          {},
          { 'User-Agent': 'Mozilla/5.0' }
        );

        const competitions = response.competitions || [];
        const notebooks = response.notebooks || [];
        const datasets = response.datasets || [];

        const entries: ScraperEntry[] = [];

        // Competition entries
        competitions.forEach((comp) => {
          const dateStr = comp.enrolledOn || comp.startTime;
          if (dateStr) {
            entries.push({
              date: this.parseDate(dateStr),
              problems: 1,
              notes: `Joined competition: ${comp.competitionName}`,
            });
          }
        });

        // Notebook entries
        notebooks.slice(0, 20).forEach((nb) => {
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
          displayName: response.displayName || username,
          profileUrl: `${this.baseUrl}/${username}`,
          avatarUrl: response.thumbnailUrl,
          totalProblems: competitions.length + notebooks.length + datasets.length,
          rank: response.tier,
        });
      } catch {
        return this.failure(`Kaggle user "${username}" not found or profile is private`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default KaggleScraper;