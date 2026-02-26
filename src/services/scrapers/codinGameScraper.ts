
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';
import { BrowserService } from '../browserService';

export class CodinGameScraper extends BaseScraper {
  platformName = 'CodinGame';
  platformSlug = 'codingame';
  protected baseUrl = 'https://www.codingame.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      // CodinGame usually uses a "public handle" which is a hash, NOT the username.
      // E.g. https://www.codingame.com/profile/c0683050474665482334812312
      // If the user provides a username, we might not find them via URL directly.
      // BUT, let's assume the user might provide their profile ID or we try to search (search is hard).
      // For now, we assume credentials.username IS the public identifier from the URL.

      const userIdOrHandle = credentials.username!;
      const profileUrl = `${this.baseUrl}/profile/${userIdOrHandle}`;

      let page;
      try {
        page = await BrowserService.getPage();

        console.log(`[CodinGameScraper] Navigating to ${profileUrl}`);
        const response = await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 45000 });

        if (response && response.status() === 404) {
          return this.failure(`CodinGame user "${userIdOrHandle}" not found`);
        }

        // Wait for profile content
        try {
          await page.waitForSelector('.profile-header', { timeout: 15000 });
        } catch (e) {
          console.log('[CodinGame] Timeout waiting for profile header');
        }

        const data = await page.evaluate(() => {
          const text = document.body.innerText;
          if (text.includes("404") || text.includes("not found")) return null;

          let level = 0;
          let xp = 0;
          let rank = 0;

          // Heuristics
          // "Level 30"
          // "12,345 XP"

          const levelMatch = text.match(/Level\s*(\d+)/i);
          if (levelMatch) level = parseInt(levelMatch[1], 10);

          const xpMatch = text.match(/([\d\s]+)XP/);
          if (xpMatch) xp = parseInt(xpMatch[1].replace(/\s/g, ''), 10);

          const rankMatch = text.match(/Rank\s*(\d+)/i);
          if (rankMatch) rank = parseInt(rankMatch[1], 10);

          return { level, xp, rank };
        });

        if (!data) return this.failure(`CodinGame user "${userIdOrHandle}" not found`);

        // Use Level/XP as proxy for activity
        const entries = data.level > 0 ? [{
          date: new Date(),
          xp: data.xp,
          level: data.level,
          notes: `CodinGame: Level ${data.level}, XP ${data.xp}`
        }] : [];

        return this.success(entries, {
          username: userIdOrHandle,
          profileUrl,
          level: data.level,
          xp: data.xp,
          rank: data.rank?.toString()
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

export default CodinGameScraper;