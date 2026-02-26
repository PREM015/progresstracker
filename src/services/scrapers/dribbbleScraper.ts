
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';
import { BrowserService } from '../browserService';

export class DribbbleScraper extends BaseScraper {
  platformName = 'Dribbble';
  platformSlug = 'dribbble';
  protected baseUrl = 'https://dribbble.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      const profileUrl = `${this.baseUrl}/${username}`;

      let page;
      try {
        page = await BrowserService.getPage();

        console.log(`[DribbbleScraper] Navigating to ${profileUrl}`);
        const response = await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

        if (response && response.status() === 404) {
          return this.failure(`Dribbble user "${username}" not found`);
        }

        // Wait for potential content
        try {
          await page.waitForSelector('body', { timeout: 10000 });
        } catch (e) { /* ignore */ }

        const data = await page.evaluate(() => {
          if (document.body.innerText.includes("Whoops, that page is gone")) return null;

          // Dribbble structure varies, best to regex the page text for stats
          const text = document.body.innerText;

          // Look for "Shots" count (often just a number followed by Label in visual structure, but text might be "100 Shots")
          // or "Shots 100"

          // Try to find specific stat containers if possible, but fallback to regex
          let shots = 0;
          let followers = 0;
          let likes = 0;

          // Regex heuristics
          // "1,234 shots"
          const shotsMatch = text.match(/([\d,]+)\s*shots?/i);
          if (shotsMatch) shots = parseInt(shotsMatch[1].replace(/,/g, ''), 10);

          const followersMatch = text.match(/([\d,]+)\s*followers?/i);
          if (followersMatch) followers = parseInt(followersMatch[1].replace(/,/g, ''), 10);

          const likesMatch = text.match(/([\d,]+)\s*likes?/i);
          if (likesMatch) likes = parseInt(likesMatch[1].replace(/,/g, ''), 10);

          return { shots, followers, likes };
        });

        if (!data) return this.failure(`Dribbble user "${username}" not found`);

        const entries = data.shots > 0 ? [{
          date: new Date(),
          problems: data.shots, // "Problems" maps to "Shots"
          notes: `Dribbble Stats: ${data.shots} shots, ${data.followers} followers`
        }] : [];

        return this.success(entries, {
          username,
          profileUrl,
          totalProblems: data.shots,
          followers: data.followers,
          likes: data.likes
        });

      } catch (error: any) {
        return this.handleError(error);
      } finally {
        if (page) await page.close();
      }

    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default DribbbleScraper;