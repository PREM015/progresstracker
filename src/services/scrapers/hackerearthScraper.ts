
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';
import { BrowserService } from '../browserService';

export class HackerEarthScraper extends BaseScraper {
  platformName = 'HackerEarth';
  platformSlug = 'hackerearth';
  protected baseUrl = 'https://www.hackerearth.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      const profileUrl = `${this.baseUrl}/@${username}`;

      let page;
      try {
        page = await BrowserService.getPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log(`[HackerEarthScraper] Navigating to ${profileUrl}`);
        const response = await page.goto(profileUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 45000
        });

        if (response && response.status() === 404) {
          return this.failure(`HackerEarth user "${username}" not found`);
        }

        // Wait for profile content
        try {
          // General wait for body or a specific container
          await page.waitForSelector('.profile-header', { timeout: 15000 });
        } catch (e) {
          console.log('[HackerEarthScraper] Timeout waiting for header, checking for 404 text');
        }

        const data = await page.evaluate(() => {
          // Heuristics for HackerEarth profile
          // Problems Solved is often in a specific metric-value class or similar
          // We'll scrape visible text numbers near keywords

          const textContent = document.body.innerText;
          if (textContent.includes("This page does not exist")) return null;

          // Example scraping strategy: Look for "Problems Solved"
          // Often structured as: Label \n Value

          // Extract metrics from containers if classes are stable, otherwise regex the text
          let problemsSolved = 0;
          let rating = 0;

          // Regex text search as backup
          const problemsMatch = textContent.match(/Problems Solved\s*(\d+)/i);
          if (problemsMatch) problemsSolved = parseInt(problemsMatch[1], 10);

          const ratingMatch = textContent.match(/Rating\s*(\d+)/i);
          if (ratingMatch) rating = parseInt(ratingMatch[1], 10);

          // Specific selector check (if classes are known/stable)
          // HackerEarth often uses .track-problems-solved or similar
          const problemParams = Array.from(document.querySelectorAll('.value')).map(el => el.textContent);
          // Since exact classes change, text match is safer for now.

          return { problemsSolved, rating, textLen: textContent.length };
        });

        if (!data) return this.failure(`HackerEarth user "${username}" not found`);

        // Even if 0, if page loaded, it's a valid user.

        const entries = data.problemsSolved > 0 ? [{
          date: new Date(),
          problems: 0,
          notes: `HackerEarth Sync: ${data.problemsSolved} problems solved`
        }] : [];

        return this.success(entries, {
          username,
          profileUrl,
          totalProblems: data.problemsSolved,
          rating: data.rating
        });

      } catch (error: any) {
        console.error('[HackerEarthScraper] Puppeteer error:', error);
        return this.handleError(error);
      } finally {
        if (page) await page.close();
      }

    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default HackerEarthScraper;