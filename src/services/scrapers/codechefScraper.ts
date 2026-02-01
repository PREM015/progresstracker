// src/services/scrapers/codechefScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult, ScraperEntry } from './types';

interface CodeChefUserData {
  success: boolean;
  profile: string;
  name: string;
  currentRating: number;
  highestRating: number;
  countryFlag: string;
  countryName: string;
  globalRank: number;
  countryRank: number;
  stars: string;
  heatMap?: Array<{ date: string; value: number }>;
  ratingData?: Array<{ code: string; rating: number; rank: number }>;
}

export class CodeChefScraper extends BaseScraper {
  platformName = 'CodeChef';
  platformSlug = 'codechef';
  protected baseUrl = 'https://www.codechef.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Try unofficial API first
      try {
        const data = await this.get<CodeChefUserData>(
          `https://codechef-api.vercel.app/handle/${username}`
        );

        if (data && data.success !== false) {
          // Parse heatmap data if available
          const entries: ScraperEntry[] = (data.heatMap || [])
            .filter((h) => h.value > 0)
            .map((h) => ({
              date: new Date(h.date),
              problems: h.value,
              notes: `Solved ${h.value} problem${h.value > 1 ? 's' : ''} on CodeChef`,
            }));

          return this.success(entries, {
            username,
            displayName: data.name,
            profileUrl: `${this.baseUrl}/users/${username}`,
            rating: data.currentRating,
            maxRating: data.highestRating,
            rank: data.stars,
          });
        }
      } catch(error) {
        // Fall through to error handling
 
        console.warn('Unofficial CodeChef API failed:', error);
      }

      // If unofficial API fails, return not supported
      return this.notSupported(
        'CodeChef auto-sync requires API access. Please track progress manually or try again later.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default CodeChefScraper;