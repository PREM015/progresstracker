/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/scrapers/userAgentManager.ts

const USER_AGENTS = {
  chrome: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ],
  firefox: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  ],
  safari: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  ],
  edge: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  ],
  mobile: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  ],
  bot: [
    'ProgressTracker/1.0 (+https://progresstracker.app/bot)',
  ],
};

type BrowserType = keyof typeof USER_AGENTS;

class UserAgentManager {
  getUserAgent(): any | import("axios").AxiosHeaderValue | undefined {
    throw new Error('Method not implemented.');
  }
  private lastUsed: Map<string, string> = new Map();
  private usageCount: Map<string, number> = new Map();

  /**
   * Get a random user agent
   */
  getRandom(type: BrowserType = 'chrome'): string {
    const agents = USER_AGENTS[type];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  /**
   * Get user agent for specific platform
   */
  getForPlatform(platform: string): string {
    // Some platforms work better with specific browsers
    const platformPreferences: Record<string, BrowserType> = {
      github: 'chrome',
      gitlab: 'chrome',
      leetcode: 'chrome',
      codeforces: 'firefox',
      linkedin: 'chrome',
      kaggle: 'chrome',
    };

    const preferred = platformPreferences[platform.toLowerCase()] || 'chrome';
    return this.getRandom(preferred);
  }

  /**
   * Get rotating user agent (different each time)
   */
  getRotating(platform: string): string {
    const allAgents = [
      ...USER_AGENTS.chrome,
      ...USER_AGENTS.firefox,
      ...USER_AGENTS.edge,
    ];

    const lastUsed = this.lastUsed.get(platform);
    let selected: string;

    do {
      selected = allAgents[Math.floor(Math.random() * allAgents.length)];
    } while (selected === lastUsed && allAgents.length > 1);

    this.lastUsed.set(platform, selected);
    this.usageCount.set(selected, (this.usageCount.get(selected) || 0) + 1);

    return selected;
  }

  /**
   * Get least used user agent
   */
  getLeastUsed(): string {
    const allAgents = [...USER_AGENTS.chrome, ...USER_AGENTS.firefox];
    
    let minUsage = Infinity;
    let leastUsed = allAgents[0];

    for (const agent of allAgents) {
      const usage = this.usageCount.get(agent) || 0;
      if (usage < minUsage) {
        minUsage = usage;
        leastUsed = agent;
      }
    }

    this.usageCount.set(leastUsed, minUsage + 1);
    return leastUsed;
  }

  /**
   * Get mobile user agent
   */
  getMobile(): string {
    return this.getRandom('mobile');
  }

  /**
   * Get bot user agent (for API-friendly platforms)
   */
  getBot(): string {
    return USER_AGENTS.bot[0];
  }

  /**
   * Reset usage statistics
   */
  reset(): void {
    this.lastUsed.clear();
    this.usageCount.clear();
  }
}

export const userAgentManager = new UserAgentManager();
export default userAgentManager;