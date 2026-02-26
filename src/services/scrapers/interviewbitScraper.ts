
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';
import { BrowserService } from '../browserService';

export class InterviewBitScraper extends BaseScraper {
  platformName = 'InterviewBit';
  platformSlug = 'interviewbit';
  protected baseUrl = 'https://www.interviewbit.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      const profileUrl = `${this.baseUrl}/profile/${username}`;

      let page;
      try {
        page = await BrowserService.getPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log(`[InterviewBitScraper] Navigating to ${profileUrl}`);
        const response = await page.goto(profileUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 45000
        });

        if (response && response.status() === 404) {
          return this.failure(`InterviewBit user "${username}" not found`);
        }

        // Wait for dynamic content
        try {
          // General wait for body or a specific container
          await page.waitForSelector('.user-stats', { timeout: 15000 });
        } catch (e) {
          console.log('[InterviewBitScraper] Timeout waiting for stats, checking for 404 text');
        }

        const data = await page.evaluate(() => {
          const textContent = document.body.innerText;
          // InterviewBit return 404 page usually has specific text
          if (textContent.includes("Page Not Found") || textContent.includes("404")) return null;

          // Example scraping strategy: Look for "Score", "Rank", "Streak"
          // Often structured as: Label \n Value

          let score = 0;
          let rank = 0;
          let streak = 0;

          // Regex text search as backup
          const scoreMatch = textContent.match(/Score\s*(\d+)/i);
          if (scoreMatch) score = parseInt(scoreMatch[1], 10);

          const rankMatch = textContent.match(/Rank\s*(\d+)/i);
          if (rankMatch) rank = parseInt(rankMatch[1], 10);

          const streakMatch = textContent.match(/Streak\s*(\d+)/i);
          if (streakMatch) streak = parseInt(streakMatch[1], 10);

          return { score, rank, streak };
        });

        if (!data) return this.failure(`InterviewBit user "${username}" not found`);

        // Even if 0, if page loaded, it's a valid user.
        // We use score as a proxy for "problems" if actual count isn't clear
        const entries = data.score > 0 ? [{
          date: new Date(),
          problems: 0,
          notes: `InterviewBit Sync: Score ${data.score}, Rank ${data.rank}`
        }] : [];

        return this.success(entries, {
          username,
          profileUrl,
          totalProblems: data.score,
          rank: data.rank?.toString(),
          streak: data.streak
        });

      } catch (error: any) {
        console.error('[InterviewBitScraper] Puppeteer error:', error);
        return this.handleError(error);
      } finally {
        if (page) await page.close();
      }

    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default InterviewBitScraper;