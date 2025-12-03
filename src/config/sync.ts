// src/config/sync.ts

export const syncConfig = {
  // Rate limiting
  rateLimit: {
    maxRequestsPerMinute: 30,
    maxConcurrentSyncs: 5,
  },

  // Retry configuration
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },

  // Timeout settings
  timeout: {
    request: 30000,
    job: 300000,
  },

  // Platforms with working auto-sync
  workingPlatforms: [
    'github',
    'gitlab',
    'leetcode',
    'codeforces',
    'atcoder',
    'codewars',
    'exercism',
    'geeksforgeeks',
    'kaggle',
    'codingame',
    'freecodecamp',
    'gssoc',
    'topcoder',
  ],

  // Platforms requiring OAuth
  oauthPlatforms: [
    'github',
    'gitlab',
    'bitbucket',
    'linkedin',
    'dribbble',
    'behance',
    'producthunt',
    'devpost',
    'devfolio',
    'mlh',
    'coursera',
    'edx',
    'udacity',
    'khanacademy',
    'hacktoberfest',
    'wellfound',
    'hired',
  ],

  // Platforms requiring web scraping (Puppeteer)
  scrapingPlatforms: [
    'codechef',
    'hackerrank',
    'hackerearth',
    'spoj',
    'interviewbit',
    'naukri',
    'internshala',
    'instahyre',
    'codecademy',
    'datacamp',
    'scrimba',
    'unstop',
  ],

  // Manual-only platforms
  manualPlatforms: [
    'udemy',
    'skillshare',
    'projecteuler',
    'algoexpert',
    'codingninjas',
    'indeed',
    'glassdoor',
    'monster',
    'dice',
    'simplyhired',
    'ziprecruiter',
    'gsoc',
    'outreachy',
    'lfx',
    'mlhfellowship',
    'swoc',
    'amazonjobs',
    'microsoftcareers',
    'googlecareers',
    'ibmcareers',
    'metacareers',
    'applecareers',
    'sourceforge',
  ],
};

export const isSyncSupported = (slug: string): boolean => {
  return syncConfig.workingPlatforms.includes(slug);
};

export const requiresOAuth = (slug: string): boolean => {
  return syncConfig.oauthPlatforms.includes(slug);
};

export const requiresScraping = (slug: string): boolean => {
  return syncConfig.scrapingPlatforms.includes(slug);
};

export const isManualOnly = (slug: string): boolean => {
  return syncConfig.manualPlatforms.includes(slug);
};

export default syncConfig;