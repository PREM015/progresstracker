# 🕷️ Platform Scrapers

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

Platform scrapers fetch data from external coding platforms and normalize it into TrackerEntry records.

---

## 🏗️ Scraper Interface

All scrapers implement a common interface:

```typescript
interface PlatformScraper {
  platformSlug: string;
  
  // Test if credentials are valid
  testConnection(config: PlatformConfig): Promise<boolean>;
  
  // Fetch latest data since lastSync
  scrape(config: PlatformConfig, since?: Date): Promise<ScrapeResult[]>;
}

interface PlatformConfig {
  username?: string;
  accessToken?: string;
  apiKey?: string;
  profileUrl?: string;
}

interface ScrapeResult {
  date: Date;
  problemsSolved?: number;
  commits?: number;
  pullRequests?: number;
  contestRating?: number;
  timeSpentMinutes?: number;
  rawData?: object;
}
```

---

## 📦 Implemented Scrapers

### GitHub Scraper

**Method**: GitHub REST API (OAuth token)

```typescript
class GitHubScraper implements PlatformScraper {
  platformSlug = 'github';
  
  async scrape(config, since) {
    const octokit = new Octokit({ auth: config.accessToken });
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner: config.username,
      since: since?.toISOString(),
    });
    return data.map(commit => ({
      date: new Date(commit.commit.author.date),
      commits: 1,
      rawData: { sha: commit.sha, message: commit.commit.message }
    }));
  }
}
```

### LeetCode Scraper

**Method**: GraphQL API (public, no auth needed for public profiles)

```typescript
class LeetCodeScraper implements PlatformScraper {
  platformSlug = 'leetcode';
  
  async scrape(config) {
    const query = `{ matchedUser(username: "${config.username}") { 
      submitStats { acSubmissionNum { difficulty count } } 
    }}`;
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    // Parse and return...
  }
}
```

### HackerRank Scraper

**Method**: HackerRank API with user's API key

### Codeforces Scraper

**Method**: Codeforces public API

---

## ➕ Adding a New Scraper

1. Create `src/services/scrapers/newPlatformScraper.ts`
2. Implement `PlatformScraper` interface
3. Register in `src/services/scrapers/index.ts`
4. Add platform entry in database (via seed or migration)
5. Write tests in `src/__tests__/scrapers/`
6. Add platform guide in `docs/sync/platform-guides/`

---

## 🔧 Error Handling

| Error | Action |
|-------|--------|
| Rate limited by platform | Retry after 1 hour, partial sync |
| Invalid credentials | Mark platform as disconnected, notify user |
| Network timeout | Retry 3 times with exponential backoff |
| Parse error | Log error, skip this platform, continue others |

---

## 📎 Related Docs

- [Sync Architecture](01-sync-architecture.md)
- [GitHub Guide](platform-guides/github.md)
- [LeetCode Guide](platform-guides/leetcode.md)
