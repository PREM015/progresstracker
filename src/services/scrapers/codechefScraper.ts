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
            globalRank: data.globalRank,
            countryRank: data.countryRank,
          });
        }
      } catch (error) {
        console.warn('Unofficial CodeChef API failed, falling back to HTML scraping:', error);
      }

      // Fallback: Scrape profile page directly
      return await this.scrapeProfilePage(username);

    } catch (error) {
      return this.handleError(error);
    }
  }

  private async scrapeProfilePage(username: string): Promise<ScraperResult> {
    try {
      const response = await this.getRequest(`${this.baseUrl}/users/${username}`);
      const html = response.data as string;

      // Extract Total Problems Solved
      // Pattern: <h3>Total Problems Solved: 632</h3> or <h5>Fully Solved (100)</h5>
      const solvedMatch = html.match(/Total Problems Solved:\s*(\d+)/i) ||
        html.match(/Fully Solved\s*\(\s*(\d+)\s*\)/i) ||
        html.match(/problems_solved["']?\s*:\s*(\d+)/i);
      const totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0;

      // Extract Rating
      // Pattern: <div class="rating-number">3355</div>
      const ratingMatch = html.match(/class="rating-number"[^>]*?>(\d+)</i);
      const currentRating = ratingMatch ? parseInt(ratingMatch[1], 10) : undefined;

      // Extract Max Rating
      // Pattern: <small>(Highest Rating 3402)</small>
      const maxRatingMatch = html.match(/Highest Rating\s*(\d+)/i);
      const maxRating = maxRatingMatch ? parseInt(maxRatingMatch[1], 10) : undefined;

      // Extract Stars / Rank
      // Pattern: <span class="rating">7★</span>
      const starsMatch = html.match(/class="rating"\s*>\s*([0-9]+)\s*★/i);
      const stars = starsMatch ? `${starsMatch[1]}★` : undefined;

      // We can't easily get daily history from HTML without parsing complex JS or charts.
      // So we'll return a single entry for "today" if we have a total difference, 
      // OR just return the total stats which will update the user's aggregate.
      // Since we don't have history, we can't generate granular entries.
      // However, the system might calculate diffs based on previous totals.

      // Return a single entry representing the current state (approximate)
      // Ideally we would diff against previous state, but here we just return the stats.
      // We'll create a "summary" entry for today.

      const entries: ScraperEntry[] = [];
      if (totalSolved > 0) {
        entries.push({
          date: new Date(),
          problems: 0, // We don't know how many solved TODAY, so 0 avoids inflating charts blindly.
          // The sync service might use the totalSolved metadata to update the user's total.
          notes: 'CodeChef Sync (HTML Fallback)',
        });
      }

      return this.success(entries, {
        username,
        profileUrl: `${this.baseUrl}/users/${username}`,
        rating: currentRating,
        maxRating: maxRating,
        rank: stars,
        totalSolved: totalSolved, // Important: pass this so tracker.ts can use it
        problemsSolved: totalSolved // Legacy support
      });

    } catch (error) {
      throw new Error(`Failed to scrape CodeChef profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Helper to expose protected request method if needed, or just use this.request
  private async getRequest(url: string) {
    return this.request(url, { method: 'GET' });
  }
}

export default CodeChefScraper;