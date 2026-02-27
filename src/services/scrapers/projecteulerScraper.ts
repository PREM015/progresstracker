
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';
import * as cheerio from 'cheerio';

export class ProjectEulerScraper extends BaseScraper {
  platformName = 'Project Euler';
  platformSlug = 'projecteuler';
  protected baseUrl = 'https://projecteuler.net';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      // The public progress page
      const profileUrl = `${this.baseUrl}/progress=${username}`;

      const response = await this.request<string>(profileUrl, {
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Check for user not found or error
      if ($('div#message').text().includes('does not exist')) {
        return this.failure(`Project Euler user "${username}" not found`);
      }

      // Extract "Solved" count
      // Usually in a div with class "info" or similar, but the structure is very simple.
      // <div id="problems_solved_section"><h3>Problems Solved</h3><div class="info"><h3>123</h3></div></div>
      // Or looking for specific text pattern

      let solved = 0;
      let level = 0;

      // Heuristic: Look for "Solved" count
      const solvedText = $('div.info h3').first().text();
      if (solvedText) {
        solved = parseInt(solvedText, 10) || 0;
      } else {
        // Fallback to regex if DOM changes
        const match = html.match(/Solved\s+(\d+)/i);
        if (match) solved = parseInt(match[1], 10);
      }

      // Extract Level
      // <div class="info"><h3>Level 3</h3></div>
      const levelText = $('div.info:contains("Level") h3').text();
      if (levelText) {
        const levelMatch = levelText.match(/Level\s+(\d+)/i);
        if (levelMatch) level = parseInt(levelMatch[1], 10);
      } else {
        // Alternative level check
        const levelAltMatch = html.match(/Level\s+(\d+)/i);
        if (levelAltMatch) level = parseInt(levelAltMatch[1], 10);
      }

      // Extract Progress Percentage
      let progressPercentage = 0;
      const progressMatch = html.match(/Progress\s*:\s*([\d.]+)%/i);
      if (progressMatch) {
        progressPercentage = parseFloat(progressMatch[1]);
      } else if (solved > 0) {
        // Heuristic: Estimation if percentage label not found
        // Total problems is roughly 800+ as of 2024
        const totalEstimate = 850;
        progressPercentage = Math.min(100, (solved / totalEstimate) * 100);
      }

      // If we found nothing, maybe the profile is private or layout changed significantly
      if (solved === 0 && level === 0 && !html.includes(username)) {
        return this.failure(`Could not parse Project Euler stats for "${username}". Profile might be private.`);
      }

      const entries = solved > 0 ? [{
        date: new Date(),
        problems: solved,
        level: level,
        notes: `Project Euler: ${solved} problems solved, Level ${level}, Progress ${progressPercentage.toFixed(1)}%`
      }] : [];

      return this.success(entries, {
        username,
        profileUrl,
        totalProblems: solved,
        level: level,
        progressPercentage: progressPercentage,
        rank: level.toString() // Using Level as rank proxy
      });

    } catch (error: any) {
      if (error.response?.status === 404) {
        return this.failure(`Project Euler user "${credentials.username}" not found`);
      }
      return this.handleError(error);
    }
  }
}

// Export as default and named for compatibility
export default ProjectEulerScraper;