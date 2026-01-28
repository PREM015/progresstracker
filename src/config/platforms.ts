// ===== FILE: src/config/platforms.ts =====
// Complete platform configuration with 80+ platforms
// Matches Prisma schema and types/platform.ts

import { Platform, PlatformCategory, PlatformCategoryId, AuthType } from '@/types/platform';

// =============================================================================
// PLATFORMS CONFIGURATION (80+ Platforms)
// =============================================================================

export const platforms: Platform[] = [
  // ========================================
  // DSA / COMPETITIVE PROGRAMMING (18)
  // ========================================
  {
    id: 'leetcode',
    name: 'LeetCode',
    slug: 'leetcode',
    category: 'dsa',
    displayName: 'LeetCode',
    icon: '/icons/leetcode.svg',
    color: '#FFA116',
    backgroundColor: '#1A1A1A',
    website: 'https://leetcode.com',
    profileUrlPattern: 'https://leetcode.com/{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Practice coding problems and prepare for technical interviews',
    dataPoints: [
      'problems_solved',
      'easy_solved',
      'medium_solved',
      'hard_solved',
      'acceptance_rate',
      'contest_rating',
      'contest_ranking',
      'streak',
      'submissions',
      'reputation',
    ],
    setupInstructions: 'Enter your LeetCode username (e.g., username from https://leetcode.com/username/)',
    syncInterval: 360, // 6 hours
    syncPriority: 10,
    rateLimit: 10,
    rateLimitWindow: 60,
    tags: ['dsa', 'interview', 'coding', 'competitive'],
  },
  {
    id: 'codeforces',
    name: 'Codeforces',
    slug: 'codeforces',
    category: 'dsa',
    displayName: 'Codeforces',
    icon: '/icons/codeforces.svg',
    color: '#1F8ACB',
    backgroundColor: '#FFFFFF',
    website: 'https://codeforces.com',
    profileUrlPattern: 'https://codeforces.com/profile/{username}',
    apiEndpoint: 'https://codeforces.com/api',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Competitive programming contests and practice',
    dataPoints: [
      'rating',
      'max_rating',
      'rank',
      'max_rank',
      'contests_participated',
      'problems_solved',
      'contributions',
      'friends_count',
      'last_online',
    ],
    setupInstructions: 'Enter your Codeforces handle (username)',
    syncInterval: 360,
    syncPriority: 9,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['competitive', 'contests', 'algorithms'],
  },
  {
    id: 'codechef',
    name: 'CodeChef',
    slug: 'codechef',
    category: 'dsa',
    displayName: 'CodeChef',
    icon: '/icons/codechef.svg',
    color: '#5B4638',
    backgroundColor: '#FFFFFF',
    website: 'https://www.codechef.com',
    profileUrlPattern: 'https://www.codechef.com/users/{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Competitive programming and monthly contests',
    dataPoints: [
      'rating',
      'highest_rating',
      'stars',
      'problems_solved',
      'contests_participated',
      'global_rank',
      'country_rank',
      'division',
    ],
    setupInstructions: 'Enter your CodeChef username',
    syncInterval: 360,
    syncPriority: 8,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['competitive', 'contests', 'monthly'],
  },
  {
    id: 'hackerrank',
    name: 'HackerRank',
    slug: 'hackerrank',
    category: 'dsa',
    displayName: 'HackerRank',
    icon: '/icons/hackerrank.svg',
    color: '#00EA64',
    backgroundColor: '#1D2332',
    website: 'https://www.hackerrank.com',
    profileUrlPattern: 'https://www.hackerrank.com/{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Coding challenges and skill certifications',
    dataPoints: [
      'badges',
      'certificates',
      'problems_solved',
      'stars',
      'rank',
      'scores_by_domain',
      'skills_verified',
    ],
    setupInstructions: 'Enter your HackerRank username',
    syncInterval: 720,
    syncPriority: 7,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['certification', 'skills', 'interview'],
  },
  {
    id: 'hackerearth',
    name: 'HackerEarth',
    slug: 'hackerearth',
    category: 'dsa',
    displayName: 'HackerEarth',
    icon: '/icons/hackerearth.svg',
    color: '#2C3454',
    backgroundColor: '#FFFFFF',
    website: 'https://www.hackerearth.com',
    profileUrlPattern: 'https://www.hackerearth.com/@{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Coding challenges and hackathons',
    dataPoints: [
      'problems_solved',
      'contests_participated',
      'hackathons_participated',
      'rating',
      'percentile',
    ],
    setupInstructions: 'Enter your HackerEarth username',
    syncInterval: 720,
    syncPriority: 6,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['hackathons', 'hiring', 'challenges'],
  },
  {
    id: 'geeksforgeeks',
    name: 'GeeksforGeeks',
    slug: 'geeksforgeeks',
    category: 'dsa',
    displayName: 'GeeksforGeeks',
    icon: '/icons/gfg.svg',
    color: '#2F8D46',
    backgroundColor: '#FFFFFF',
    website: 'https://www.geeksforgeeks.org',
    profileUrlPattern: 'https://auth.geeksforgeeks.org/user/{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'DSA practice and computer science resources',
    dataPoints: [
      'problems_solved',
      'coding_score',
      'streak',
      'institute_rank',
      'monthly_score',
      'overall_score',
      'languages_used',
    ],
    setupInstructions: 'Enter your GeeksforGeeks username',
    syncInterval: 360,
    syncPriority: 8,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['dsa', 'tutorials', 'practice'],
  },
  {
    id: 'atcoder',
    name: 'AtCoder',
    slug: 'atcoder',
    category: 'dsa',
    displayName: 'AtCoder',
    icon: '/icons/atcoder.svg',
    color: '#222222',
    backgroundColor: '#FFFFFF',
    website: 'https://atcoder.jp',
    profileUrlPattern: 'https://atcoder.jp/users/{username}',
    apiEndpoint: 'https://kenkoooo.com/atcoder/atcoder-api',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Japanese competitive programming platform with high-quality problems',
    dataPoints: [
      'rating',
      'highest_rating',
      'rank',
      'contests_participated',
      'problems_solved',
      'accepted_count',
      'rated_point_sum',
    ],
    setupInstructions: 'Enter your AtCoder username',
    syncInterval: 720,
    syncPriority: 7,
    rateLimit: 10,
    rateLimitWindow: 60,
    tags: ['competitive', 'japanese', 'algorithms'],
  },
  {
    id: 'spoj',
    name: 'SPOJ',
    slug: 'spoj',
    category: 'dsa',
    displayName: 'SPOJ',
    icon: '/icons/spoj.svg',
    color: '#0055A4',
    backgroundColor: '#FFFFFF',
    website: 'https://www.spoj.com',
    profileUrlPattern: 'https://www.spoj.com/users/{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Sphere Online Judge - classical algorithmic problems',
    dataPoints: [
      'problems_solved',
      'points',
      'rank',
      'submissions',
      'world_rank',
    ],
    setupInstructions: 'Enter your SPOJ username',
    syncInterval: 1440,
    syncPriority: 5,
    rateLimit: 3,
    rateLimitWindow: 60,
    tags: ['classical', 'algorithms', 'online-judge'],
  },
  {
    id: 'topcoder',
    name: 'TopCoder',
    slug: 'topcoder',
    category: 'dsa',
    displayName: 'TopCoder',
    icon: '/icons/topcoder.svg',
    color: '#29A8E0',
    backgroundColor: '#FFFFFF',
    website: 'https://www.topcoder.com',
    profileUrlPattern: 'https://www.topcoder.com/members/{username}',
    apiEndpoint: 'https://api.topcoder.com/v5',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Competitive programming and crowdsourcing platform',
    dataPoints: [
      'algorithm_rating',
      'algorithm_rank',
      'marathon_rating',
      'development_rating',
      'challenges_won',
      'earnings',
      'copilot_stats',
    ],
    setupInstructions: 'Enter your TopCoder handle',
    syncInterval: 1440,
    syncPriority: 5,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['competitive', 'crowdsourcing', 'marathon'],
  },
  {
    id: 'codingninjas',
    name: 'Coding Ninjas',
    slug: 'codingninjas',
    category: 'dsa',
    displayName: 'Coding Ninjas',
    icon: '/icons/codingninjas.svg',
    color: '#DD1F26',
    backgroundColor: '#FFFFFF',
    website: 'https://www.codingninjas.com',
    profileUrlPattern: 'https://www.codingninjas.com/studio/profile/{username}',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'India-focused DSA practice & structured courses',
    dataPoints: [
      'problems_solved',
      'courses_completed',
      'practice_sessions',
      'streak',
      'certificates',
      'ninja_level',
    ],
    setupInstructions: 'Manually track Coding Ninjas progress (DSA sheets, courses, contests)',
    syncInterval: 1440,
    syncPriority: 4,
    tags: ['india', 'courses', 'dsa'],
  },
  {
    id: 'codewars',
    name: 'Codewars',
    slug: 'codewars',
    category: 'dsa',
    displayName: 'Codewars',
    icon: '/icons/codewars.svg',
    color: '#B1361E',
    backgroundColor: '#1A1A1B',
    website: 'https://www.codewars.com',
    profileUrlPattern: 'https://www.codewars.com/users/{username}',
    apiEndpoint: 'https://www.codewars.com/api/v1',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Kata-based coding challenges with community-created problems',
    dataPoints: [
      'honor',
      'rank',
      'katas_completed',
      'languages_trained',
      'leaderboard_position',
      'authored_katas',
      'clan',
    ],
    setupInstructions: 'Enter your Codewars username',
    syncInterval: 360,
    syncPriority: 6,
    rateLimit: 10,
    rateLimitWindow: 60,
    tags: ['kata', 'community', 'languages'],
  },
  {
    id: 'exercism',
    name: 'Exercism',
    slug: 'exercism',
    category: 'dsa',
    displayName: 'Exercism',
    icon: '/icons/exercism.svg',
    color: '#009CAB',
    backgroundColor: '#FFFFFF',
    website: 'https://exercism.org',
    profileUrlPattern: 'https://exercism.org/profiles/{username}',
    apiEndpoint: 'https://exercism.org/api/v2',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiresCredentials: false,
    description: 'Free code practice and mentorship for all levels',
    dataPoints: [
      'exercises_completed',
      'tracks_joined',
      'tracks_completed',
      'reputation',
      'mentoring_sessions',
      'badges',
      'solutions_published',
    ],
    setupInstructions: 'Enter your Exercism username or API token',
    syncInterval: 720,
    syncPriority: 5,
    rateLimit: 10,
    rateLimitWindow: 60,
    tags: ['mentorship', 'languages', 'free'],
  },
  {
    id: 'projecteuler',
    name: 'Project Euler',
    slug: 'projecteuler',
    category: 'dsa',
    displayName: 'Project Euler',
    icon: '/icons/projecteuler.svg',
    color: '#4A4A4A',
    backgroundColor: '#FFFFFF',
    website: 'https://projecteuler.net',
    profileUrlPattern: 'https://projecteuler.net/profile/{username}.png',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Mathematical/computational problems requiring programming skills',
    dataPoints: [
      'problems_solved',
      'level',
      'awards',
      'country_rank',
      'solve_streak',
    ],
    setupInstructions: 'Manually log problems solved from Project Euler',
    syncInterval: 1440,
    syncPriority: 3,
    tags: ['math', 'computational', 'puzzles'],
  },
  {
    id: 'interviewbit',
    name: 'InterviewBit',
    slug: 'interviewbit',
    category: 'dsa',
    displayName: 'InterviewBit',
    icon: '/icons/interviewbit.svg',
    color: '#FF6B6B',
    backgroundColor: '#FFFFFF',
    website: 'https://www.interviewbit.com',
    profileUrlPattern: 'https://www.interviewbit.com/profile/{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Interview preparation platform with structured learning paths',
    dataPoints: [
      'problems_solved',
      'score',
      'rank',
      'streak',
      'level',
      'badges',
    ],
    setupInstructions: 'Enter your InterviewBit username',
    syncInterval: 720,
    syncPriority: 6,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['interview', 'preparation', 'structured'],
  },
  {
    id: 'algoexpert',
    name: 'AlgoExpert',
    slug: 'algoexpert',
    category: 'dsa',
    displayName: 'AlgoExpert',
    icon: '/icons/algoexpert.svg',
    color: '#00A896',
    backgroundColor: '#FFFFFF',
    website: 'https://www.algoexpert.io',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Curated 160+ coding interview questions with video explanations',
    dataPoints: [
      'questions_completed',
      'assessments_passed',
      'certificates',
      'streak',
    ],
    setupInstructions: 'Manually track completed questions from AlgoExpert',
    syncInterval: 1440,
    syncPriority: 4,
    tags: ['interview', 'premium', 'video'],
  },
  {
    id: 'binarysearch',
    name: 'BinarySearch',
    slug: 'binarysearch',
    category: 'dsa',
    displayName: 'BinarySearch',
    icon: '/icons/binarysearch.svg',
    color: '#3B82F6',
    backgroundColor: '#0F172A',
    website: 'https://binarysearch.com',
    profileUrlPattern: 'https://binarysearch.com/@/{username}',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Collaborative coding platform with live contests',
    dataPoints: [
      'problems_solved',
      'rating',
      'contests_participated',
      'rooms_joined',
      'streak',
    ],
    setupInstructions: 'Enter your BinarySearch username',
    syncInterval: 720,
    syncPriority: 4,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['collaborative', 'live', 'rooms'],
  },
  {
    id: 'cses',
    name: 'CSES',
    slug: 'cses',
    category: 'dsa',
    displayName: 'CSES Problem Set',
    icon: '/icons/cses.svg',
    color: '#4A5568',
    backgroundColor: '#FFFFFF',
    website: 'https://cses.fi',
    profileUrlPattern: 'https://cses.fi/user/{userId}',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Finnish competitive programming problem set',
    dataPoints: [
      'problems_solved',
      'total_submissions',
      'score',
    ],
    setupInstructions: 'Manually track CSES problems solved',
    syncInterval: 1440,
    syncPriority: 3,
    tags: ['competitive', 'finnish', 'classical'],
  },
  {
    id: 'dmoj',
    name: 'DMOJ',
    slug: 'dmoj',
    category: 'dsa',
    displayName: 'DMOJ',
    icon: '/icons/dmoj.svg',
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
    website: 'https://dmoj.ca',
    profileUrlPattern: 'https://dmoj.ca/user/{username}',
    apiEndpoint: 'https://dmoj.ca/api/v2',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiresCredentials: false,
    description: 'Canadian online judge with contests and problems',
    dataPoints: [
      'problems_solved',
      'points',
      'rating',
      'rank',
      'contests',
    ],
    setupInstructions: 'Enter your DMOJ username',
    syncInterval: 720,
    syncPriority: 4,
    rateLimit: 10,
    rateLimitWindow: 60,
    tags: ['canadian', 'contests', 'online-judge'],
  },

  // ========================================
  // JOB PORTALS (14)
  // ========================================
  {
    id: 'linkedin',
    name: 'LinkedIn',
    slug: 'linkedin',
    category: 'job',
    displayName: 'LinkedIn',
    icon: '/icons/linkedin.svg',
    color: '#0A66C2',
    backgroundColor: '#FFFFFF',
    website: 'https://www.linkedin.com',
    profileUrlPattern: 'https://www.linkedin.com/in/{username}',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Professional networking and job search platform',
    dataPoints: [
      'applications_sent',
      'profile_views',
      'connections',
      'posts',
      'engagement',
      'search_appearances',
      'followers',
    ],
    setupInstructions: 'Click "Connect with LinkedIn" to authorize access',
    syncInterval: 1440,
    syncPriority: 8,
    rateLimit: 100,
    rateLimitWindow: 3600,
    tags: ['networking', 'professional', 'jobs'],
  },
  {
    id: 'indeed',
    name: 'Indeed',
    slug: 'indeed',
    category: 'job',
    displayName: 'Indeed',
    icon: '/icons/indeed.svg',
    color: '#2164F3',
    backgroundColor: '#FFFFFF',
    website: 'https://www.indeed.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Global job search platform with millions of listings',
    dataPoints: [
      'applications_sent',
      'saved_jobs',
      'interviews_scheduled',
      'responses_received',
    ],
    setupInstructions: 'Manually log job applications from Indeed',
    syncInterval: 1440,
    syncPriority: 5,
    tags: ['global', 'job-search', 'applications'],
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    slug: 'glassdoor',
    category: 'job',
    displayName: 'Glassdoor',
    icon: '/icons/glassdoor.svg',
    color: '#0CAA41',
    backgroundColor: '#FFFFFF',
    website: 'https://www.glassdoor.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Company reviews, salaries, and job listings',
    dataPoints: [
      'applications_sent',
      'reviews_read',
      'saved_jobs',
      'company_follows',
      'salary_comparisons',
    ],
    setupInstructions: 'Manually track Glassdoor applications',
    syncInterval: 1440,
    syncPriority: 5,
    tags: ['reviews', 'salaries', 'research'],
  },
  {
    id: 'naukri',
    name: 'Naukri',
    slug: 'naukri',
    category: 'job',
    displayName: 'Naukri.com',
    icon: '/icons/naukri.svg',
    color: '#4A90D9',
    backgroundColor: '#FFFFFF',
    website: 'https://www.naukri.com',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: true,
    description: "India's leading job portal with 75M+ resumes",
    dataPoints: [
      'applications_sent',
      'profile_views',
      'recruiter_calls',
      'profile_score',
      'resume_downloads',
    ],
    setupInstructions: 'Enter your Naukri.com registered email',
    syncInterval: 1440,
    syncPriority: 7,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['india', 'job-portal', 'recruiters'],
  },
  {
    id: 'wellfound',
    name: 'Wellfound',
    slug: 'wellfound',
    category: 'job',
    displayName: 'Wellfound (AngelList)',
    icon: '/icons/angellist.svg',
    color: '#000000',
    backgroundColor: '#FFFFFF',
    website: 'https://wellfound.com',
    profileUrlPattern: 'https://wellfound.com/u/{username}',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Startup jobs and investments platform',
    dataPoints: [
      'applications_sent',
      'matches',
      'saved_jobs',
      'intro_requests',
      'startup_follows',
    ],
    setupInstructions: 'Connect with Wellfound account',
    syncInterval: 1440,
    syncPriority: 6,
    rateLimit: 50,
    rateLimitWindow: 3600,
    tags: ['startups', 'tech', 'equity'],
  },
  {
    id: 'internshala',
    name: 'Internshala',
    slug: 'internshala',
    category: 'job',
    displayName: 'Internshala',
    icon: '/icons/internshala.svg',
    color: '#00A5EC',
    backgroundColor: '#FFFFFF',
    website: 'https://internshala.com',
    profileUrlPattern: 'https://internshala.com/student/profile/{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: true,
    description: 'Internships and fresher jobs in India',
    dataPoints: [
      'applications_sent',
      'certifications_earned',
      'trainings_completed',
      'interviews_scheduled',
      'profile_strength',
    ],
    setupInstructions: 'Enter Internshala credentials for data sync',
    syncInterval: 1440,
    syncPriority: 6,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['internships', 'freshers', 'india'],
  },
  {
    id: 'monster',
    name: 'Monster',
    slug: 'monster',
    category: 'job',
    displayName: 'Monster',
    icon: '/icons/monster.svg',
    color: '#6E45A5',
    backgroundColor: '#FFFFFF',
    website: 'https://www.monster.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Global employment website with career advice',
    dataPoints: [
      'applications_sent',
      'profile_views',
      'saved_jobs',
    ],
    setupInstructions: 'Manually log Monster applications',
    syncInterval: 1440,
    syncPriority: 4,
    tags: ['global', 'career', 'advice'],
  },
  {
    id: 'hired',
    name: 'Hired',
    slug: 'hired',
    category: 'job',
    displayName: 'Hired',
    icon: '/icons/hired.svg',
    color: '#2B6FBA',
    backgroundColor: '#FFFFFF',
    website: 'https://hired.com',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Tech job marketplace with salary transparency',
    dataPoints: [
      'interview_requests',
      'offers_received',
      'salary_bids',
      'company_views',
      'profile_strength',
    ],
    setupInstructions: 'Authorize Hired to share job activity',
    syncInterval: 1440,
    syncPriority: 6,
    rateLimit: 50,
    rateLimitWindow: 3600,
    tags: ['tech', 'salary', 'marketplace'],
  },
  {
    id: 'dice',
    name: 'Dice',
    slug: 'dice',
    category: 'job',
    displayName: 'Dice',
    icon: '/icons/dice.svg',
    color: '#EB1C24',
    backgroundColor: '#FFFFFF',
    website: 'https://www.dice.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Tech-focused job board for IT professionals',
    dataPoints: [
      'applications_sent',
      'profile_views',
      'saved_searches',
      'job_alerts',
    ],
    setupInstructions: 'Manually track Dice applications',
    syncInterval: 1440,
    syncPriority: 4,
    tags: ['tech', 'it', 'specialized'],
  },
  {
    id: 'simplyhired',
    name: 'SimplyHired',
    slug: 'simplyhired',
    category: 'job',
    displayName: 'SimplyHired',
    icon: '/icons/simplyhired.svg',
    color: '#5A67D8',
    backgroundColor: '#FFFFFF',
    website: 'https://www.simplyhired.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Job search engine aggregating from multiple sources',
    dataPoints: [
      'applications_sent',
      'saved_jobs',
    ],
    setupInstructions: 'Manually log applications',
    syncInterval: 1440,
    syncPriority: 3,
    tags: ['aggregator', 'search', 'simple'],
  },
  {
    id: 'ziprecruiter',
    name: 'ZipRecruiter',
    slug: 'ziprecruiter',
    category: 'job',
    displayName: 'ZipRecruiter',
    icon: '/icons/ziprecruiter.svg',
    color: '#1C68D4',
    backgroundColor: '#FFFFFF',
    website: 'https://www.ziprecruiter.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'AI-powered job matching technology',
    dataPoints: [
      'applications_sent',
      'job_matches',
      'interview_invites',
      'profile_views',
    ],
    setupInstructions: 'Manually track ZipRecruiter activity',
    syncInterval: 1440,
    syncPriority: 4,
    tags: ['ai', 'matching', 'automated'],
  },
  {
    id: 'instahyre',
    name: 'Instahyre',
    slug: 'instahyre',
    category: 'job',
    displayName: 'Instahyre',
    icon: '/icons/instahyre.svg',
    color: '#FF6B35',
    backgroundColor: '#FFFFFF',
    website: 'https://www.instahyre.com',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: true,
    description: 'AI-powered job matching for tech professionals in India',
    dataPoints: [
      'applications_sent',
      'interview_requests',
      'offers_received',
      'profile_strength',
      'response_rate',
    ],
    setupInstructions: 'Enter Instahyre login credentials',
    syncInterval: 1440,
    syncPriority: 5,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['india', 'ai', 'tech'],
  },
  {
    id: 'levels',
    name: 'Levels.fyi',
    slug: 'levels',
    category: 'job',
    displayName: 'Levels.fyi',
    icon: '/icons/levels.svg',
    color: '#1DB954',
    backgroundColor: '#FFFFFF',
    website: 'https://www.levels.fyi',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Tech salary and leveling comparison',
    dataPoints: [
      'submissions',
      'upvotes',
      'comments',
      'salary_datapoints',
    ],
    setupInstructions: 'Manually track contributions and research',
    syncInterval: 1440,
    syncPriority: 3,
    tags: ['salary', 'levels', 'comparison'],
  },
  {
    id: 'blind',
    name: 'Blind',
    slug: 'blind',
    category: 'job',
    displayName: 'Blind',
    icon: '/icons/blind.svg',
    color: '#21A366',
    backgroundColor: '#FFFFFF',
    website: 'https://www.teamblind.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Anonymous professional network for verified employees',
    dataPoints: [
      'posts',
      'comments',
      'upvotes',
      'referral_requests',
    ],
    setupInstructions: 'Manually track Blind activity',
    syncInterval: 1440,
    syncPriority: 2,
    tags: ['anonymous', 'discussions', 'insider'],
  },

  // ========================================
  // HACKATHONS & COMPETITIONS (12)
  // ========================================
  {
    id: 'devpost',
    name: 'Devpost',
    slug: 'devpost',
    category: 'hackathon',
    displayName: 'Devpost',
    icon: '/icons/devpost.svg',
    color: '#003E54',
    backgroundColor: '#FFFFFF',
    website: 'https://devpost.com',
    profileUrlPattern: 'https://devpost.com/{username}',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Hackathon discovery and project showcase platform',
    dataPoints: [
      'hackathons_participated',
      'projects_submitted',
      'achievements',
      'wins',
      'likes_received',
      'followers',
    ],
    setupInstructions: 'Connect your Devpost account',
    syncInterval: 720,
    syncPriority: 7,
    rateLimit: 20,
    rateLimitWindow: 60,
    tags: ['hackathons', 'projects', 'showcase'],
  },
  {
    id: 'devfolio',
    name: 'Devfolio',
    slug: 'devfolio',
    category: 'hackathon',
    displayName: 'Devfolio',
    icon: '/icons/devfolio.svg',
    color: '#3770FF',
    backgroundColor: '#FFFFFF',
    website: 'https://devfolio.co',
    profileUrlPattern: 'https://devfolio.co/@{username}',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Indian hackathon platform with major events',
    dataPoints: [
      'hackathons_participated',
      'projects_submitted',
      'wins',
      'team_invites',
      'xp_points',
    ],
    setupInstructions: 'Authorize Devfolio access',
    syncInterval: 720,
    syncPriority: 7,
    rateLimit: 20,
    rateLimitWindow: 60,
    tags: ['india', 'hackathons', 'ethereum'],
  },
  {
    id: 'mlh',
    name: 'MLH',
    slug: 'mlh',
    category: 'hackathon',
    displayName: 'Major League Hacking',
    icon: '/icons/mlh.svg',
    color: '#E73427',
    backgroundColor: '#FFFFFF',
    website: 'https://mlh.io',
    profileUrlPattern: 'https://mlh.io/profile/{username}',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Official student hackathon league',
    dataPoints: [
      'hackathons_participated',
      'season_points',
      'badges',
      'rank',
      'events_attended',
    ],
    setupInstructions: 'Connect with MLH account',
    syncInterval: 720,
    syncPriority: 7,
    rateLimit: 20,
    rateLimitWindow: 60,
    tags: ['student', 'league', 'official'],
  },
  {
    id: 'unstop',
    name: 'Unstop',
    slug: 'unstop',
    category: 'hackathon',
    displayName: 'Unstop (D2C)',
    icon: '/icons/unstop.svg',
    color: '#0073E6',
    backgroundColor: '#FFFFFF',
    website: 'https://unstop.com',
    profileUrlPattern: 'https://unstop.com/u/{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Competitions, hackathons, and hiring challenges',
    dataPoints: [
      'competitions_participated',
      'hackathons_participated',
      'quizzes_completed',
      'certificates_earned',
      'xp_points',
      'rank',
    ],
    setupInstructions: 'Enter Unstop username',
    syncInterval: 720,
    syncPriority: 6,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['india', 'competitions', 'hiring'],
  },
  {
    id: 'kaggle',
    name: 'Kaggle',
    slug: 'kaggle',
    category: 'hackathon',
    displayName: 'Kaggle',
    icon: '/icons/kaggle.svg',
    color: '#20BEFF',
    backgroundColor: '#FFFFFF',
    website: 'https://www.kaggle.com',
    profileUrlPattern: 'https://www.kaggle.com/{username}',
    apiEndpoint: 'https://www.kaggle.com/api/v1',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiresCredentials: true,
    description: 'Data science competitions and ML community',
    dataPoints: [
      'competitions_entered',
      'medals_gold',
      'medals_silver',
      'medals_bronze',
      'tier',
      'notebooks_published',
      'datasets_published',
      'ranking',
      'points',
    ],
    setupInstructions: 'Enter your Kaggle username and API key',
    syncInterval: 720,
    syncPriority: 8,
    rateLimit: 10,
    rateLimitWindow: 60,
    tags: ['data-science', 'ml', 'competitions'],
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    slug: 'dribbble',
    category: 'hackathon',
    displayName: 'Dribbble',
    icon: '/icons/dribbble.svg',
    color: '#EA4C89',
    backgroundColor: '#FFFFFF',
    website: 'https://dribbble.com',
    profileUrlPattern: 'https://dribbble.com/{username}',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Design portfolio and community platform',
    dataPoints: [
      'shots_posted',
      'likes_received',
      'followers',
      'following',
      'projects',
      'views',
      'collections',
    ],
    setupInstructions: 'Connect Dribbble account',
    syncInterval: 1440,
    syncPriority: 5,
    rateLimit: 50,
    rateLimitWindow: 3600,
    tags: ['design', 'portfolio', 'creative'],
  },
  {
    id: 'behance',
    name: 'Behance',
    slug: 'behance',
    category: 'hackathon',
    displayName: 'Behance',
    icon: '/icons/behance.svg',
    color: '#1769FF',
    backgroundColor: '#FFFFFF',
    website: 'https://www.behance.net',
    profileUrlPattern: 'https://www.behance.net/{username}',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Adobe creative portfolio showcase',
    dataPoints: [
      'projects_published',
      'appreciations',
      'followers',
      'following',
      'views',
      'comments',
    ],
    setupInstructions: 'Authorize Behance access with Adobe ID',
    syncInterval: 1440,
    syncPriority: 5,
    rateLimit: 50,
    rateLimitWindow: 3600,
    tags: ['design', 'adobe', 'creative'],
  },
  {
    id: 'producthunt',
    name: 'Product Hunt',
    slug: 'producthunt',
    category: 'hackathon',
    displayName: 'Product Hunt',
    icon: '/icons/producthunt.svg',
    color: '#DA552F',
    backgroundColor: '#FFFFFF',
    website: 'https://www.producthunt.com',
    profileUrlPattern: 'https://www.producthunt.com/@{username}',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Product launches and discovery platform',
    dataPoints: [
      'products_launched',
      'products_made',
      'upvotes_received',
      'followers',
      'collections',
      'streak',
    ],
    setupInstructions: 'Connect Product Hunt account',
    syncInterval: 1440,
    syncPriority: 5,
    rateLimit: 50,
    rateLimitWindow: 3600,
    tags: ['products', 'launches', 'startup'],
  },
  {
    id: 'hackathoncom',
    name: 'Hackathon.com',
    slug: 'hackathoncom',
    category: 'hackathon',
    displayName: 'Hackathon.com',
    icon: '/icons/hackathon.svg',
    color: '#FF4F00',
    backgroundColor: '#FFFFFF',
    website: 'https://www.hackathon.com',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Global hackathon discovery platform',
    dataPoints: [
      'hackathons_participated',
      'projects_submitted',
      'awards_won',
    ],
    setupInstructions: 'Enter your Hackathon.com username',
    syncInterval: 1440,
    syncPriority: 4,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['global', 'discovery', 'events'],
  },
  {
    id: 'codingame',
    name: 'CodinGame',
    slug: 'codingame',
    category: 'hackathon',
    displayName: 'CodinGame',
    icon: '/icons/codingame.svg',
    color: '#F2BB13',
    backgroundColor: '#2B2B2B',
    website: 'https://www.codingame.com',
    profileUrlPattern: 'https://www.codingame.com/profile/{userId}',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Game-based coding challenges and competitions',
    dataPoints: [
      'level',
      'xp',
      'achievements',
      'clash_of_code_played',
      'challenges_completed',
      'rank',
      'languages_used',
    ],
    setupInstructions: 'Enter CodinGame username',
    syncInterval: 720,
    syncPriority: 5,
    rateLimit: 10,
    rateLimitWindow: 60,
    tags: ['games', 'multiplayer', 'fun'],
  },
  {
    id: 'replit',
    name: 'Replit',
    slug: 'replit',
    category: 'hackathon',
    displayName: 'Replit',
    icon: '/icons/replit.svg',
    color: '#F26207',
    backgroundColor: '#0E1525',
    website: 'https://replit.com',
    profileUrlPattern: 'https://replit.com/@{username}',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Collaborative browser-based IDE',
    dataPoints: [
      'repls_created',
      'cycles',
      'followers',
      'following',
      'forked_repls',
      'bounties_completed',
    ],
    setupInstructions: 'Connect with Replit account',
    syncInterval: 1440,
    syncPriority: 4,
    rateLimit: 20,
    rateLimitWindow: 60,
    tags: ['ide', 'collaborative', 'cloud'],
  },
  {
    id: 'showwcase',
    name: 'Showwcase',
    slug: 'showwcase',
    category: 'hackathon',
    displayName: 'Showwcase',
    icon: '/icons/showwcase.svg',
    color: '#7B4BFF',
    backgroundColor: '#0D0D0D',
    website: 'https://www.showwcase.com',
    profileUrlPattern: 'https://www.showwcase.com/{username}',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Developer portfolio and social network',
    dataPoints: [
      'shows_created',
      'followers',
      'following',
      'circles',
      'reactions',
    ],
    setupInstructions: 'Connect with Showwcase account',
    syncInterval: 1440,
    syncPriority: 3,
    rateLimit: 20,
    rateLimitWindow: 60,
    tags: ['portfolio', 'social', 'shows'],
  },

  // ========================================
  // GIT / VERSION CONTROL (5)
  // ========================================
  {
    id: 'github',
    name: 'GitHub',
    slug: 'github',
    category: 'git',
    displayName: 'GitHub',
    icon: '/icons/github.svg',
    color: '#181717',
    backgroundColor: '#FFFFFF',
    website: 'https://github.com',
    profileUrlPattern: 'https://github.com/{username}',
    apiEndpoint: 'https://api.github.com',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: true,
    requiresCredentials: false,
    description: 'Code hosting and collaboration platform',
    dataPoints: [
      'public_repos',
      'private_repos',
      'total_commits',
      'pull_requests_opened',
      'pull_requests_merged',
      'issues_opened',
      'issues_closed',
      'stars_received',
      'forks',
      'contributions_last_year',
      'current_streak',
      'longest_streak',
      'followers',
      'following',
    ],
    setupInstructions: 'Click "Connect with GitHub" to authorize',
    syncInterval: 360,
    syncPriority: 10,
    rateLimit: 5000,
    rateLimitWindow: 3600,
    tags: ['git', 'opensource', 'collaboration'],
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    slug: 'gitlab',
    category: 'git',
    displayName: 'GitLab',
    icon: '/icons/gitlab.svg',
    color: '#FC6D26',
    backgroundColor: '#FFFFFF',
    website: 'https://gitlab.com',
    profileUrlPattern: 'https://gitlab.com/{username}',
    apiEndpoint: 'https://gitlab.com/api/v4',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: true,
    requiresCredentials: false,
    description: 'Complete DevOps platform with CI/CD',
    dataPoints: [
      'projects',
      'commits',
      'merge_requests',
      'pipelines_run',
      'issues_created',
      'contributions',
      'followers',
    ],
    setupInstructions: 'Authorize GitLab access',
    syncInterval: 720,
    syncPriority: 8,
    rateLimit: 2000,
    rateLimitWindow: 3600,
    tags: ['git', 'devops', 'cicd'],
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    slug: 'bitbucket',
    category: 'git',
    displayName: 'Bitbucket',
    icon: '/icons/bitbucket.svg',
    color: '#0052CC',
    backgroundColor: '#FFFFFF',
    website: 'https://bitbucket.org',
    profileUrlPattern: 'https://bitbucket.org/{username}',
    apiEndpoint: 'https://api.bitbucket.org/2.0',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: true,
    requiresCredentials: false,
    description: 'Git repository management by Atlassian',
    dataPoints: [
      'repositories',
      'commits',
      'pull_requests',
      'branches',
      'pipelines',
    ],
    setupInstructions: 'Connect Bitbucket account',
    syncInterval: 720,
    syncPriority: 6,
    rateLimit: 1000,
    rateLimitWindow: 3600,
    tags: ['git', 'atlassian', 'enterprise'],
  },
  {
    id: 'sourceforge',
    name: 'SourceForge',
    slug: 'sourceforge',
    category: 'git',
    displayName: 'SourceForge',
    icon: '/icons/sourceforge.svg',
    color: '#FF6600',
    backgroundColor: '#FFFFFF',
    website: 'https://sourceforge.net',
    profileUrlPattern: 'https://sourceforge.net/u/{username}',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Open source software hosting and distribution',
    dataPoints: [
      'projects',
      'downloads',
      'reviews',
      'commits',
    ],
    setupInstructions: 'Manually track SourceForge projects',
    syncInterval: 1440,
    syncPriority: 3,
    tags: ['opensource', 'distribution', 'legacy'],
  },
  {
    id: 'codeberg',
    name: 'Codeberg',
    slug: 'codeberg',
    category: 'git',
    displayName: 'Codeberg',
    icon: '/icons/codeberg.svg',
    color: '#2185D0',
    backgroundColor: '#FFFFFF',
    website: 'https://codeberg.org',
    profileUrlPattern: 'https://codeberg.org/{username}',
    apiEndpoint: 'https://codeberg.org/api/v1',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiresCredentials: false,
    description: 'Non-profit, community-driven git hosting',
    dataPoints: [
      'repositories',
      'commits',
      'pull_requests',
      'issues',
      'stars',
    ],
    setupInstructions: 'Enter Codeberg username and access token',
    syncInterval: 720,
    syncPriority: 4,
    rateLimit: 100,
    rateLimitWindow: 3600,
    tags: ['opensource', 'nonprofit', 'gitea'],
  },

  // ========================================
  // LEARNING PLATFORMS (15)
  // ========================================
  {
    id: 'coursera',
    name: 'Coursera',
    slug: 'coursera',
    category: 'learning',
    displayName: 'Coursera',
    icon: '/icons/coursera.svg',
    color: '#0056D2',
    backgroundColor: '#FFFFFF',
    website: 'https://www.coursera.org',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Online courses from top universities and companies',
    dataPoints: [
      'courses_completed',
      'courses_in_progress',
      'certificates_earned',
      'specializations_completed',
      'hours_spent',
      'grades_average',
    ],
    setupInstructions: 'Connect your Coursera account',
    syncInterval: 1440,
    syncPriority: 7,
    rateLimit: 100,
    rateLimitWindow: 3600,
    tags: ['mooc', 'certificates', 'university'],
  },
  {
    id: 'udemy',
    name: 'Udemy',
    slug: 'udemy',
    category: 'learning',
    displayName: 'Udemy',
    icon: '/icons/udemy.svg',
    color: '#A435F0',
    backgroundColor: '#FFFFFF',
    website: 'https://www.udemy.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Online learning marketplace with 200k+ courses',
    dataPoints: [
      'courses_enrolled',
      'courses_completed',
      'certificates_earned',
      'hours_spent',
      'skills_learned',
    ],
    setupInstructions: 'Manually log Udemy course progress',
    syncInterval: 1440,
    syncPriority: 5,
    tags: ['marketplace', 'affordable', 'practical'],
  },
  {
    id: 'edx',
    name: 'edX',
    slug: 'edx',
    category: 'learning',
    displayName: 'edX',
    icon: '/icons/edx.svg',
    color: '#02262B',
    backgroundColor: '#FFFFFF',
    website: 'https://www.edx.org',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'University-level online courses from MIT, Harvard, etc.',
    dataPoints: [
      'courses_completed',
      'certificates_earned',
      'programs_completed',
      'verified_certificates',
      'micromasters',
    ],
    setupInstructions: 'Authorize edX access',
    syncInterval: 1440,
    syncPriority: 6,
    rateLimit: 100,
    rateLimitWindow: 3600,
    tags: ['mooc', 'university', 'verified'],
  },
  {
    id: 'pluralsight',
    name: 'Pluralsight',
    slug: 'pluralsight',
    category: 'learning',
    displayName: 'Pluralsight',
    icon: '/icons/pluralsight.svg',
    color: '#F15B2A',
    backgroundColor: '#FFFFFF',
    website: 'https://www.pluralsight.com',
    profileUrlPattern: 'https://app.pluralsight.com/profile/{username}',
    apiEndpoint: 'https://api.pluralsight.com',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiresCredentials: true,
    description: 'Technology skills platform with Skill IQ assessments',
    dataPoints: [
      'courses_completed',
      'skill_iq_scores',
      'role_iq_scores',
      'hours_watched',
      'paths_completed',
      'channels_followed',
    ],
    setupInstructions: 'Enter Pluralsight API key or username',
    syncInterval: 1440,
    syncPriority: 6,
    rateLimit: 50,
    rateLimitWindow: 3600,
    tags: ['tech', 'skill-assessment', 'enterprise'],
  },
  {
    id: 'linkedinlearning',
    name: 'LinkedIn Learning',
    slug: 'linkedinlearning',
    category: 'learning',
    displayName: 'LinkedIn Learning',
    icon: '/icons/linkedinlearning.svg',
    color: '#0A66C2',
    backgroundColor: '#FFFFFF',
    website: 'https://www.linkedin.com/learning',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Professional development courses integrated with LinkedIn',
    dataPoints: [
      'courses_completed',
      'certificates_earned',
      'hours_spent',
      'skills_added',
      'learning_paths_completed',
    ],
    setupInstructions: 'Connect with LinkedIn account',
    syncInterval: 1440,
    syncPriority: 6,
    rateLimit: 100,
    rateLimitWindow: 3600,
    tags: ['professional', 'linkedin', 'career'],
  },
  {
    id: 'freecodecamp',
    name: 'freeCodeCamp',
    slug: 'freecodecamp',
    category: 'learning',
    displayName: 'freeCodeCamp',
    icon: '/icons/freecodecamp.svg',
    color: '#0A0A23',
    backgroundColor: '#FFFFFF',
    website: 'https://www.freecodecamp.org',
    profileUrlPattern: 'https://www.freecodecamp.org/{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Free coding curriculum with certifications',
    dataPoints: [
      'certifications_earned',
      'challenges_completed',
      'points',
      'streak',
      'portfolio_projects',
    ],
    setupInstructions: 'Enter freeCodeCamp username',
    syncInterval: 720,
    syncPriority: 7,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['free', 'bootcamp', 'projects'],
  },
  {
    id: 'codecademy',
    name: 'Codecademy',
    slug: 'codecademy',
    category: 'learning',
    displayName: 'Codecademy',
    icon: '/icons/codecademy.svg',
    color: '#1F4056',
    backgroundColor: '#FFFFFF',
    website: 'https://www.codecademy.com',
    profileUrlPattern: 'https://www.codecademy.com/profiles/{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Interactive coding lessons for beginners',
    dataPoints: [
      'courses_completed',
      'badges_earned',
      'streak',
      'skills_learned',
      'projects_completed',
    ],
    setupInstructions: 'Enter Codecademy username',
    syncInterval: 720,
    syncPriority: 5,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['interactive', 'beginner', 'languages'],
  },
  {
    id: 'udacity',
    name: 'Udacity',
    slug: 'udacity',
    category: 'learning',
    displayName: 'Udacity',
    icon: '/icons/udacity.svg',
    color: '#02B3E4',
    backgroundColor: '#FFFFFF',
    website: 'https://www.udacity.com',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Nanodegree programs for tech careers',
    dataPoints: [
      'nanodegrees_completed',
      'courses_completed',
      'projects_submitted',
      'project_reviews',
      'hours_spent',
    ],
    setupInstructions: 'Authorize Udacity access',
    syncInterval: 1440,
    syncPriority: 6,
    rateLimit: 50,
    rateLimitWindow: 3600,
    tags: ['nanodegree', 'career', 'projects'],
  },
  {
    id: 'skillshare',
    name: 'Skillshare',
    slug: 'skillshare',
    category: 'learning',
    displayName: 'Skillshare',
    icon: '/icons/skillshare.svg',
    color: '#00FF84',
    backgroundColor: '#002333',
    website: 'https://www.skillshare.com',
    profileUrlPattern: 'https://www.skillshare.com/en/profile/{username}',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Creative and business classes',
    dataPoints: [
      'classes_taken',
      'projects_created',
      'minutes_watched',
      'following',
      'followers',
    ],
    setupInstructions: 'Manually log Skillshare courses',
    syncInterval: 1440,
    syncPriority: 4,
    tags: ['creative', 'design', 'business'],
  },
  {
    id: 'khanacademy',
    name: 'Khan Academy',
    slug: 'khanacademy',
    category: 'learning',
    displayName: 'Khan Academy',
    icon: '/icons/khanacademy.svg',
    color: '#14BF96',
    backgroundColor: '#FFFFFF',
    website: 'https://www.khanacademy.org',
    profileUrlPattern: 'https://www.khanacademy.org/profile/{username}',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Free world-class education for anyone, anywhere',
    dataPoints: [
      'courses_completed',
      'mastery_points',
      'badges_earned',
      'streak',
      'energy_points',
      'videos_watched',
    ],
    setupInstructions: 'Connect Khan Academy account',
    syncInterval: 720,
    syncPriority: 5,
    rateLimit: 50,
    rateLimitWindow: 3600,
    tags: ['free', 'k12', 'foundational'],
  },
  {
    id: 'datacamp',
    name: 'DataCamp',
    slug: 'datacamp',
    category: 'learning',
    displayName: 'DataCamp',
    icon: '/icons/datacamp.svg',
    color: '#03EF62',
    backgroundColor: '#05192D',
    website: 'https://www.datacamp.com',
    profileUrlPattern: 'https://www.datacamp.com/profile/{username}',
    apiEndpoint: 'https://www.datacamp.com/api',
    authType: 'api',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Data science and analytics courses',
    dataPoints: [
      'courses_completed',
      'xp_earned',
      'certifications',
      'tracks_completed',
      'skills_assessed',
      'streak',
    ],
    setupInstructions: 'Enter DataCamp username',
    syncInterval: 720,
    syncPriority: 6,
    rateLimit: 10,
    rateLimitWindow: 60,
    tags: ['data-science', 'python', 'r'],
  },
  {
    id: 'scrimba',
    name: 'Scrimba',
    slug: 'scrimba',
    category: 'learning',
    displayName: 'Scrimba',
    icon: '/icons/scrimba.svg',
    color: '#2B283A',
    backgroundColor: '#FFFFFF',
    website: 'https://scrimba.com',
    profileUrlPattern: 'https://scrimba.com/@{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Interactive coding screencasts',
    dataPoints: [
      'courses_completed',
      'certificates_earned',
      'projects_completed',
      'screencasts_watched',
      'streak',
    ],
    setupInstructions: 'Enter Scrimba username',
    syncInterval: 1440,
    syncPriority: 4,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['interactive', 'frontend', 'react'],
  },
  {
    id: 'frontendmasters',
    name: 'Frontend Masters',
    slug: 'frontendmasters',
    category: 'learning',
    displayName: 'Frontend Masters',
    icon: '/icons/frontendmasters.svg',
    color: '#C02D28',
    backgroundColor: '#1E1E1E',
    website: 'https://frontendmasters.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Expert-led video courses for web development',
    dataPoints: [
      'courses_completed',
      'hours_watched',
      'learning_paths',
      'bookmarks',
    ],
    setupInstructions: 'Manually track Frontend Masters progress',
    syncInterval: 1440,
    syncPriority: 4,
    tags: ['frontend', 'expert', 'video'],
  },
  {
    id: 'egghead',
    name: 'egghead.io',
    slug: 'egghead',
    category: 'learning',
    displayName: 'egghead.io',
    icon: '/icons/egghead.svg',
    color: '#FCFBFA',
    backgroundColor: '#252526',
    website: 'https://egghead.io',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Concise developer screencasts',
    dataPoints: [
      'lessons_completed',
      'courses_completed',
      'minutes_watched',
      'streak',
    ],
    setupInstructions: 'Manually track egghead.io progress',
    syncInterval: 1440,
    syncPriority: 3,
    tags: ['concise', 'screencasts', 'modern'],
  },
  {
    id: 'sololearn',
    name: 'SoloLearn',
    slug: 'sololearn',
    category: 'learning',
    displayName: 'SoloLearn',
    icon: '/icons/sololearn.svg',
    color: '#1ABC9C',
    backgroundColor: '#FFFFFF',
    website: 'https://www.sololearn.com',
    profileUrlPattern: 'https://www.sololearn.com/profile/{userId}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Mobile-first coding education',
    dataPoints: [
      'courses_completed',
      'xp',
      'certificates',
      'badges',
      'streak',
      'followers',
    ],
    setupInstructions: 'Enter SoloLearn profile URL or ID',
    syncInterval: 1440,
    syncPriority: 4,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['mobile', 'beginner', 'gamified'],
  },

  // ========================================
  // OPEN SOURCE PROGRAMS (10)
  // ========================================
  {
    id: 'gsoc',
    name: 'Google Summer of Code',
    slug: 'gsoc',
    category: 'opensource',
    displayName: 'GSoC',
    icon: '/icons/google.svg',
    color: '#4285F4',
    backgroundColor: '#FFFFFF',
    website: 'https://summerofcode.withgoogle.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Google open source internship program for students',
    dataPoints: [
      'applications_submitted',
      'projects_completed',
      'mentorship_hours',
      'status',
      'year_participated',
      'organization',
    ],
    setupInstructions: 'Manually log GSoC participation',
    syncInterval: 1440,
    syncPriority: 8,
    tags: ['google', 'summer', 'stipend'],
  },
  {
    id: 'outreachy',
    name: 'Outreachy',
    slug: 'outreachy',
    category: 'opensource',
    displayName: 'Outreachy',
    icon: '/icons/outreachy.svg',
    color: '#5E4B8B',
    backgroundColor: '#FFFFFF',
    website: 'https://www.outreachy.org',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Diversity internships in open source and open science',
    dataPoints: [
      'applications_submitted',
      'initial_contributions',
      'status',
      'round',
      'organization',
    ],
    setupInstructions: 'Track Outreachy applications manually',
    syncInterval: 1440,
    syncPriority: 7,
    tags: ['diversity', 'internship', 'inclusive'],
  },
  {
    id: 'lfx',
    name: 'LFX Mentorship',
    slug: 'lfx',
    category: 'opensource',
    displayName: 'LFX Mentorship',
    icon: '/icons/lfx.svg',
    color: '#0094FF',
    backgroundColor: '#FFFFFF',
    website: 'https://lfx.linuxfoundation.org/tools/mentorship',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Linux Foundation mentorship program',
    dataPoints: [
      'applications_submitted',
      'projects_completed',
      'status',
      'term',
      'organization',
    ],
    setupInstructions: 'Manually track LFX applications',
    syncInterval: 1440,
    syncPriority: 7,
    tags: ['linux', 'cncf', 'enterprise'],
  },  // Continuing from GSSoC...
  {
    id: 'gssoc',
    name: 'GirlScript Summer of Code',
    slug: 'gssoc',
    category: 'opensource',
    displayName: 'GSSoC',
    icon: '/icons/gssoc.svg',
    color: '#FF7A59',
    backgroundColor: '#FFFFFF',
    website: 'https://gssoc.girlscript.tech',
    profileUrlPattern: 'https://gssoc.girlscript.tech/leaderboard',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Open source program for beginners',
    dataPoints: [
      'contributions',
      'prs_merged',
      'points',
      'rank',
      'badges',
      'level',
    ],
    setupInstructions: 'Enter GSSoC GitHub username',
    syncInterval: 720,
    syncPriority: 6,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['india', 'beginner', 'girlscript'],
  },
  {
    id: 'hacktoberfest',
    name: 'Hacktoberfest',
    slug: 'hacktoberfest',
    category: 'opensource',
    displayName: 'Hacktoberfest',
    icon: '/icons/hacktoberfest.svg',
    color: '#FF8AE2',
    backgroundColor: '#170F1E',
    website: 'https://hacktoberfest.com',
    authType: 'oauth',
    supportsAutoSync: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiresCredentials: false,
    description: "DigitalOcean's annual open source celebration in October",
    dataPoints: [
      'prs_submitted',
      'prs_accepted',
      'completion_status',
      'year',
      'rewards_earned',
    ],
    setupInstructions: 'Connect GitHub account for Hacktoberfest tracking',
    syncInterval: 360,
    syncPriority: 7,
    rateLimit: 20,
    rateLimitWindow: 60,
    tags: ['october', 'digitalocean', 'swag'],
  },
  {
    id: 'mlhfellowship',
    name: 'MLH Fellowship',
    slug: 'mlhfellowship',
    category: 'opensource',
    displayName: 'MLH Fellowship',
    icon: '/icons/mlh.svg',
    color: '#E73427',
    backgroundColor: '#FFFFFF',
    website: 'https://fellowship.mlh.io',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: '12-week remote internship alternative',
    dataPoints: [
      'applications_submitted',
      'projects_completed',
      'status',
      'pod',
      'track',
      'batch',
    ],
    setupInstructions: 'Manually log MLH Fellowship participation',
    syncInterval: 1440,
    syncPriority: 7,
    tags: ['remote', 'internship', 'fellowship'],
  },
  {
    id: 'swoc',
    name: 'Social Winter of Code',
    slug: 'swoc',
    category: 'opensource',
    displayName: 'SWoC',
    icon: '/icons/swoc.svg',
    color: '#FF6B6B',
    backgroundColor: '#FFFFFF',
    website: 'https://swoc.scriptindia.org',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Winter open source program by Script Foundation',
    dataPoints: [
      'contributions',
      'prs_merged',
      'points',
      'certificates',
      'rank',
    ],
    setupInstructions: 'Track SWoC contributions manually',
    syncInterval: 1440,
    syncPriority: 5,
    tags: ['winter', 'india', 'beginner'],
  },
  {
    id: 'kwoc',
    name: 'Kharagpur Winter of Code',
    slug: 'kwoc',
    category: 'opensource',
    displayName: 'KWoC',
    icon: '/icons/kwoc.svg',
    color: '#4A90E2',
    backgroundColor: '#FFFFFF',
    website: 'https://kwoc.kossiitkgp.org',
    profileUrlPattern: 'https://kwoc.kossiitkgp.org/stats/{username}',
    authType: 'scraping',
    supportsAutoSync: true,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: "IIT Kharagpur's open source program",
    dataPoints: [
      'contributions',
      'prs_merged',
      'commits',
      'projects_contributed',
      'lines_added',
      'lines_removed',
    ],
    setupInstructions: 'Enter KWoC GitHub username',
    syncInterval: 720,
    syncPriority: 5,
    rateLimit: 5,
    rateLimitWindow: 60,
    tags: ['iit', 'winter', 'koss'],
  },
  {
    id: 'jwoc',
    name: 'JGEC Winter of Code',
    slug: 'jwoc',
    category: 'opensource',
    displayName: 'JWoC',
    icon: '/icons/jwoc.svg',
    color: '#6C63FF',
    backgroundColor: '#FFFFFF',
    website: 'https://jwoc.tech',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: "JGEC's winter open source program",
    dataPoints: [
      'contributions',
      'prs_merged',
      'points',
      'rank',
    ],
    setupInstructions: 'Track JWoC contributions manually',
    syncInterval: 1440,
    syncPriority: 4,
    tags: ['winter', 'india', 'jgec'],
  },
  {
    id: 'ssoc',
    name: 'Social Summer of Code',
    slug: 'ssoc',
    category: 'opensource',
    displayName: 'SSoC',
    icon: '/icons/ssoc.svg',
    color: '#FF9A00',
    backgroundColor: '#FFFFFF',
    website: 'https://ssoc.devfolio.co',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Summer open source program for students',
    dataPoints: [
      'contributions',
      'prs_merged',
      'points',
      'rank',
      'badges',
    ],
    setupInstructions: 'Track SSoC contributions manually',
    syncInterval: 1440,
    syncPriority: 5,
    tags: ['summer', 'india', 'social'],
  },

  // ========================================
  // COMPANY-SPECIFIC PLATFORMS (8)
  // ========================================
  {
    id: 'amazonjobs',
    name: 'Amazon Jobs',
    slug: 'amazonjobs',
    category: 'company',
    displayName: 'Amazon Careers',
    icon: '/icons/amazon.svg',
    color: '#FF9900',
    backgroundColor: '#232F3E',
    website: 'https://www.amazon.jobs',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Amazon career opportunities worldwide',
    dataPoints: [
      'applications_submitted',
      'interviews_completed',
      'status',
      'positions_applied',
      'oa_completed',
    ],
    setupInstructions: 'Manually track Amazon applications',
    syncInterval: 1440,
    syncPriority: 6,
    tags: ['faang', 'amazon', 'aws'],
  },
  {
    id: 'microsoftcareers',
    name: 'Microsoft Careers',
    slug: 'microsoftcareers',
    category: 'company',
    displayName: 'Microsoft Careers',
    icon: '/icons/microsoft.svg',
    color: '#00A4EF',
    backgroundColor: '#FFFFFF',
    website: 'https://careers.microsoft.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Microsoft job opportunities globally',
    dataPoints: [
      'applications_submitted',
      'interviews_completed',
      'status',
      'roles_applied',
      'referrals',
    ],
    setupInstructions: 'Manually log Microsoft applications',
    syncInterval: 1440,
    syncPriority: 6,
    tags: ['faang', 'microsoft', 'azure'],
  },
  {
    id: 'googlecareers',
    name: 'Google Careers',
    slug: 'googlecareers',
    category: 'company',
    displayName: 'Google Careers',
    icon: '/icons/google.svg',
    color: '#4285F4',
    backgroundColor: '#FFFFFF',
    website: 'https://careers.google.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Google job opportunities worldwide',
    dataPoints: [
      'applications_submitted',
      'interviews_completed',
      'status',
      'referrals',
      'teams_applied',
    ],
    setupInstructions: 'Track Google applications manually',
    syncInterval: 1440,
    syncPriority: 6,
    tags: ['faang', 'google', 'alphabet'],
  },
  {
    id: 'metacareers',
    name: 'Meta Careers',
    slug: 'metacareers',
    category: 'company',
    displayName: 'Meta Careers',
    icon: '/icons/meta.svg',
    color: '#0081FB',
    backgroundColor: '#FFFFFF',
    website: 'https://www.metacareers.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Meta (Facebook) job opportunities',
    dataPoints: [
      'applications_submitted',
      'interviews_completed',
      'status',
      'recruiter_calls',
      'teams_applied',
    ],
    setupInstructions: 'Manually log Meta applications',
    syncInterval: 1440,
    syncPriority: 6,
    tags: ['faang', 'meta', 'facebook'],
  },
  {
    id: 'applecareers',
    name: 'Apple Careers',
    slug: 'applecareers',
    category: 'company',
    displayName: 'Apple Careers',
    icon: '/icons/apple.svg',
    color: '#000000',
    backgroundColor: '#FFFFFF',
    website: 'https://www.apple.com/careers',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Apple job opportunities globally',
    dataPoints: [
      'applications_submitted',
      'interviews_completed',
      'status',
      'roles_applied',
    ],
    setupInstructions: 'Track Apple applications manually',
    syncInterval: 1440,
    syncPriority: 6,
    tags: ['faang', 'apple', 'hardware'],
  },
  {
    id: 'netflixjobs',
    name: 'Netflix Jobs',
    slug: 'netflixjobs',
    category: 'company',
    displayName: 'Netflix Jobs',
    icon: '/icons/netflix.svg',
    color: '#E50914',
    backgroundColor: '#000000',
    website: 'https://jobs.netflix.com',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Netflix job opportunities',
    dataPoints: [
      'applications_submitted',
      'interviews_completed',
      'status',
      'roles_applied',
    ],
    setupInstructions: 'Manually track Netflix applications',
    syncInterval: 1440,
    syncPriority: 5,
    tags: ['faang', 'netflix', 'streaming'],
  },
  {
    id: 'ibmcareers',
    name: 'IBM Careers',
    slug: 'ibmcareers',
    category: 'company',
    displayName: 'IBM Careers',
    icon: '/icons/ibm.svg',
    color: '#0530AD',
    backgroundColor: '#FFFFFF',
    website: 'https://www.ibm.com/careers',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'IBM job opportunities worldwide',
    dataPoints: [
      'applications_submitted',
      'interviews_completed',
      'status',
      'divisions_applied',
    ],
    setupInstructions: 'Manually track IBM applications',
    syncInterval: 1440,
    syncPriority: 5,
    tags: ['enterprise', 'ibm', 'consulting'],
  },
  {
    id: 'salesforcecareers',
    name: 'Salesforce Careers',
    slug: 'salesforcecareers',
    category: 'company',
    displayName: 'Salesforce Careers',
    icon: '/icons/salesforce.svg',
    color: '#00A1E0',
    backgroundColor: '#FFFFFF',
    website: 'https://www.salesforce.com/company/careers',
    authType: 'manual',
    supportsAutoSync: false,
    supportsOAuth: false,
    supportsApiKey: false,
    requiresCredentials: false,
    description: 'Salesforce job opportunities',
    dataPoints: [
      'applications_submitted',
      'interviews_completed',
      'status',
      'roles_applied',
    ],
    setupInstructions: 'Manually track Salesforce applications',
    syncInterval: 1440,
    syncPriority: 5,
    tags: ['enterprise', 'salesforce', 'crm'],
  },
];

// =============================================================================
// CATEGORIES CONFIGURATION
// =============================================================================

export const categories: PlatformCategory[] = [
  {
    id: 'dsa',
    name: 'DSA & Competitive Programming',
    slug: 'dsa',
    description: 'Coding practice and competitive programming platforms',
    icon: 'Code',
    color: '#6366f1',
    order: 1,
  },
  {
    id: 'job',
    name: 'Job Portals',
    slug: 'job',
    description: 'Job search and career platforms',
    icon: 'Briefcase',
    color: '#10b981',
    order: 2,
  },
  {
    id: 'hackathon',
    name: 'Hackathons & Competitions',
    slug: 'hackathon',
    description: 'Hackathons, design challenges, and competitions',
    icon: 'Trophy',
    color: '#f59e0b',
    order: 3,
  },
  {
    id: 'git',
    name: 'Version Control',
    slug: 'git',
    description: 'Git repositories and version control platforms',
    icon: 'GitBranch',
    color: '#8b5cf6',
    order: 4,
  },
  {
    id: 'learning',
    name: 'Learning Platforms',
    slug: 'learning',
    description: 'Online courses and educational platforms',
    icon: 'GraduationCap',
    color: '#ec4899',
    order: 5,
  },
  {
    id: 'opensource',
    name: 'Open Source Programs',
    slug: 'opensource',
    description: 'Open source contribution programs and initiatives',
    icon: 'Heart',
    color: '#ef4444',
    order: 6,
  },
  {
    id: 'company',
    name: 'Company Portals',
    slug: 'company',
    description: 'Direct company career pages (FAANG, etc.)',
    icon: 'Building',
    color: '#64748b',
    order: 7,
  },
];
// =============================================================================
// HELPER FUNCTIONS - ORGANIZED BY CATEGORY
// =============================================================================

// -----------------------------------------------------------------------------
// 1. BASIC LOOKUPS - Get single platform or category
// -----------------------------------------------------------------------------

/** Get platform by ID */
export function getPlatformById(id: string): Platform | undefined {
  return platforms.find((p) => p.id === id);
}

/** Get platform by slug */
export function getPlatformBySlug(slug: string): Platform | undefined {
  return platforms.find((p) => p.slug === slug);
}

/** Get platform by ID or slug (flexible lookup) */
export function getPlatform(idOrSlug: string): Platform | undefined {
  return platforms.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

/** Check if platform exists by ID or slug */
export function platformExists(idOrSlug: string): boolean {
  return platforms.some((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

/** Get category by ID */
export function getCategoryById(id: PlatformCategoryId): PlatformCategory | undefined {
  return categories.find((c) => c.id === id);
}

/** Get category by slug */
export function getCategoryBySlug(slug: string): PlatformCategory | undefined {
  return categories.find((c) => c.slug === slug);
}

// -----------------------------------------------------------------------------
// 2. BULK LOOKUPS - Get multiple platforms
// -----------------------------------------------------------------------------

/** Get multiple platforms by IDs */
export function getPlatformsByIds(ids: string[]): Platform[] {
  return platforms.filter((p) => ids.includes(p.id));
}

/** Get multiple platforms by slugs */
export function getPlatformsBySlugs(slugs: string[]): Platform[] {
  return platforms.filter((p) => slugs.includes(p.slug));
}

/** Get all platforms in a specific category */
export function getPlatformsByCategory(categoryId: PlatformCategoryId): Platform[] {
  return platforms.filter((p) => p.category === categoryId);
}

/** Get platforms by tag */
export function getPlatformsByTag(tag: string): Platform[] {
  const lowerTag = tag.toLowerCase();
  return platforms.filter((p) => p.tags?.some((t) => t.toLowerCase() === lowerTag));
}

/** Get platforms by data point (e.g., 'problems_solved', 'rating') */
export function getPlatformsByDataPoint(dataPoint: string): Platform[] {
  return platforms.filter((p) => p.dataPoints?.includes(dataPoint));
}

/** Get platforms by color */
export function getPlatformsByColor(color: string): Platform[] {
  return platforms.filter((p) => p.color?.toLowerCase() === color.toLowerCase());
}

// -----------------------------------------------------------------------------
// 3. AUTH TYPE FILTERS - Filter by connection method
// -----------------------------------------------------------------------------

/** Get all OAuth platforms */
export function getOAuthPlatforms(): Platform[] {
  return platforms.filter((p) => p.authType === 'oauth');
}

/** Get all API-based platforms */
export function getApiPlatforms(): Platform[] {
  return platforms.filter((p) => p.authType === 'api' || p.authType === 'api_key');
}

/** Get all scraping-based platforms */
export function getScrapingPlatforms(): Platform[] {
  return platforms.filter((p) => p.authType === 'scraping');
}

/** Get all manual-entry platforms */
export function getManualPlatforms(): Platform[] {
  return platforms.filter((p) => p.authType === 'manual');
}

/** Get platforms grouped by auth type */
export function getPlatformsGroupedByAuthType(): Record<AuthType, Platform[]> {
  const groups: Record<AuthType, Platform[]> = {
    oauth: [], api: [], api_key: [], scraping: [], manual: [], none: [], hybrid: [],
  };
  platforms.forEach((p) => {
    if (p.authType && groups[p.authType]) groups[p.authType].push(p);
  });
  return groups;
}

// -----------------------------------------------------------------------------
// 4. SYNC & CAPABILITY FILTERS
// -----------------------------------------------------------------------------

/** Get all auto-syncable platforms */
export function getAutoSyncablePlatforms(): Platform[] {
  return platforms.filter((p) => p.supportsAutoSync);
}

/** Get platforms with API endpoint defined */
export function getPlatformsWithApi(): Platform[] {
  return platforms.filter((p) => p.apiEndpoint);
}

/** Get platforms with website URL */
export function getPlatformsWithWebsite(): Platform[] {
  return platforms.filter((p) => p.website);
}

/** Get platforms requiring credentials */
export function getPlatformsRequiringCredentials(): Platform[] {
  return platforms.filter((p) => p.requiresCredentials);
}

/** Get platforms not requiring credentials */
export function getPlatformsWithoutCredentials(): Platform[] {
  return platforms.filter((p) => !p.requiresCredentials && p.authType !== 'oauth');
}

/** Check if platform supports a specific feature */
export function platformSupports(platform: Platform, feature: 'autoSync' | 'oauth' | 'apiKey' | 'webhook'): boolean {
  switch (feature) {
    case 'autoSync': return platform.supportsAutoSync === true;
    case 'oauth': return platform.supportsOAuth === true || platform.authType === 'oauth';
    case 'apiKey': return platform.supportsApiKey === true || platform.authType === 'api_key';
    case 'webhook': return platform.supportsWebhook === true;
    default: return false;
  }
}

/** Check if platform requires credentials */
export function requiresCredentials(platform: Platform): boolean {
  return platform.requiresCredentials || platform.authType === 'oauth' || platform.authType === 'api_key';
}

// -----------------------------------------------------------------------------
// 5. SORTING FUNCTIONS
// -----------------------------------------------------------------------------

/** Get platforms sorted alphabetically */
export function getPlatformsAlphabetically(): Platform[] {
  return [...platforms].sort((a, b) => a.name.localeCompare(b.name));
}

/** Get platforms sorted by sync priority (highest first) */
export function getPlatformsBySyncPriority(): Platform[] {
  return [...platforms].sort((a, b) => (b.syncPriority || 0) - (a.syncPriority || 0));
}

/** Get platforms sorted by category order, then alphabetically */
export function getPlatformsSortedByCategory(): Platform[] {
  return [...platforms].sort((a, b) => {
    const catA = getCategoryById(a.category);
    const catB = getCategoryById(b.category);
    const orderDiff = (catA?.order || 0) - (catB?.order || 0);
    return orderDiff !== 0 ? orderDiff : a.name.localeCompare(b.name);
  });
}

/** Get platforms by connection difficulty */
export function getPlatformsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Platform[] {
  return platforms.filter((p) => getConnectionDifficulty(p) === difficulty);
}

// -----------------------------------------------------------------------------
// 6. SEARCH & FILTER
// -----------------------------------------------------------------------------

/** Search platforms by name, description, slug, or tags */
export function searchPlatforms(query: string): Platform[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return platforms;
  return platforms.filter((p) => {
    const searchableText = [p.name, p.displayName, p.description, p.slug, ...(p.tags || [])]
      .filter(Boolean).join(' ').toLowerCase();
    return searchableText.includes(lowerQuery);
  });
}

/** Filter platforms by multiple criteria */
export function filterPlatforms(filters: {
  category?: PlatformCategoryId;
  authType?: AuthType;
  supportsAutoSync?: boolean;
  search?: string;
}): Platform[] {
  let result = [...platforms];
  if (filters.category) result = result.filter((p) => p.category === filters.category);
  if (filters.authType) result = result.filter((p) => p.authType === filters.authType);
  if (filters.supportsAutoSync !== undefined) result = result.filter((p) => p.supportsAutoSync === filters.supportsAutoSync);
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    result = result.filter((p) => {
      const text = [p.name, p.displayName, p.description, p.slug, ...(p.tags || [])].filter(Boolean).join(' ').toLowerCase();
      return text.includes(q);
    });
  }
  return result;
}

// -----------------------------------------------------------------------------
// 7. GROUPING FUNCTIONS
// -----------------------------------------------------------------------------

/** Get all platforms grouped by category */
export function getPlatformsGroupedByCategory(): Record<PlatformCategoryId, Platform[]> {
  return categories.reduce((acc, cat) => {
    acc[cat.id] = getPlatformsByCategory(cat.id);
    return acc;
  }, {} as Record<PlatformCategoryId, Platform[]>);
}

/** Get all categories with their statistics */
export function getAllCategoriesWithStats(): Array<PlatformCategory & { stats: ReturnType<typeof getCategoryStats> }> {
  return categories.map((cat) => ({ ...cat, stats: getCategoryStats(cat.id) }));
}

// -----------------------------------------------------------------------------
// 8. COUNT FUNCTIONS
// -----------------------------------------------------------------------------

/** Get total number of platforms */
export function getTotalPlatformCount(): number {
  return platforms.length;
}

/** Get platform count for a specific category */
export function getPlatformCountByCategory(categoryId: PlatformCategoryId): number {
  return getPlatformsByCategory(categoryId).length;
}

/** Get category statistics */
export function getCategoryStats(categoryId: PlatformCategoryId): {
  total: number; autoSync: number; manual: number; oauth: number; api: number; scraping: number;
} {
  const catPlatforms = getPlatformsByCategory(categoryId);
  return {
    total: catPlatforms.length,
    autoSync: catPlatforms.filter((p) => p.supportsAutoSync).length,
    manual: catPlatforms.filter((p) => p.authType === 'manual').length,
    oauth: catPlatforms.filter((p) => p.authType === 'oauth').length,
    api: catPlatforms.filter((p) => p.authType === 'api' || p.authType === 'api_key').length,
    scraping: catPlatforms.filter((p) => p.authType === 'scraping').length,
  };
}

// -----------------------------------------------------------------------------
// 9. DISCOVERY & RECOMMENDATIONS
// -----------------------------------------------------------------------------

/** Get popular platforms (by sync priority) */
export function getPopularPlatforms(limit: number = 10): Platform[] {
  return getPlatformsBySyncPriority().slice(0, limit);
}

/** Get random platforms */
export function getRandomPlatforms(count: number = 5): Platform[] {
  return [...platforms].sort(() => Math.random() - 0.5).slice(0, count);
}

/** Get random platforms from a specific category */
export function getRandomPlatformsByCategory(categoryId: PlatformCategoryId, count: number = 3): Platform[] {
  return [...getPlatformsByCategory(categoryId)].sort(() => Math.random() - 0.5).slice(0, count);
}

/** Get related platforms (same category, excluding current) */
export function getRelatedPlatforms(platformId: string, limit: number = 5): Platform[] {
  const platform = getPlatformById(platformId);
  if (!platform) return [];
  return getPlatformsByCategory(platform.category).filter((p) => p.id !== platformId).slice(0, limit);
}

/** Get similar platforms (based on shared tags) */
export function getSimilarPlatforms(platformId: string, limit: number = 5): Platform[] {
  const platform = getPlatformById(platformId);
  if (!platform?.tags?.length) return [];
  const tagSet = new Set(platform.tags);
  return platforms
    .filter((p) => p.id !== platformId)
    .map((p) => ({ platform: p, matchCount: p.tags?.filter((t) => tagSet.has(t)).length || 0 }))
    .filter((item) => item.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, limit)
    .map((item) => item.platform);
}

/** Get onboarding platforms (recommended for new users) */
export function getOnboardingPlatforms(): Platform[] {
  return getPlatformsByIds(['github', 'leetcode', 'linkedin', 'hackerrank', 'coursera']);
}

/** Get beginner-friendly platforms */
export function getBeginnerPlatforms(): Platform[] {
  return platforms.filter((p) =>
    p.tags?.includes('beginner') || p.tags?.includes('free') || p.authType === 'manual' ||
    ['freecodecamp', 'codecademy', 'khanacademy'].includes(p.id)
  );
}

// -----------------------------------------------------------------------------
// 10. SPECIAL COLLECTIONS
// -----------------------------------------------------------------------------

/** Get competitive programming platforms */
export function getCompetitiveProgrammingPlatforms(): Platform[] {
  return platforms.filter((p) =>
    p.category === 'dsa' && (p.tags?.includes('competitive') || p.tags?.includes('contests') || p.dataPoints?.includes('rating'))
  );
}

/** Get job search platforms */
export function getJobSearchPlatforms(): Platform[] {
  return getPlatformsByCategory('job').filter((p) =>
    p.dataPoints?.includes('applications_sent') || p.dataPoints?.includes('applications_submitted')
  );
}

/** Get certification platforms */
export function getCertificationPlatforms(): Platform[] {
  return platforms.filter((p) =>
    p.dataPoints?.includes('certificates') || p.dataPoints?.includes('certifications') || p.dataPoints?.includes('certificates_earned')
  );
}

/** Get FAANG company platforms */
export function getFAANGPlatforms(): Platform[] {
  return getPlatformsBySlugs(['amazonjobs', 'applecareers', 'metacareers', 'netflixjobs', 'googlecareers']);
}

/** Get Indian platforms */
export function getIndianPlatforms(): Platform[] {
  return platforms.filter((p) =>
    p.tags?.includes('india') ||
    ['naukri', 'internshala', 'instahyre', 'geeksforgeeks', 'codingninjas', 'unstop', 'gssoc', 'kwoc'].includes(p.slug)
  );
}

// -----------------------------------------------------------------------------
// 11. DATA EXTRACTION
// -----------------------------------------------------------------------------

/** Get all unique tags across all platforms */
export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  platforms.forEach((p) => p.tags?.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

/** Get all unique data points across all platforms */
export function getAllDataPoints(): string[] {
  const dpSet = new Set<string>();
  platforms.forEach((p) => p.dataPoints?.forEach((dp) => dpSet.add(dp)));
  return Array.from(dpSet).sort();
}

// -----------------------------------------------------------------------------
// 12. URL & PROFILE GENERATORS
// -----------------------------------------------------------------------------

/** Generate profile URL for a platform */
export function generateProfileUrl(platform: Platform, username: string): string | null {
  if (!platform.profileUrlPattern || !username) return null;
  return platform.profileUrlPattern.replace('{username}', username).replace('{userId}', username);
}

// -----------------------------------------------------------------------------
// 13. LABELS & DISPLAY HELPERS
// -----------------------------------------------------------------------------

/** Get connection method label */
export function getConnectionMethodLabel(authType: AuthType): string {
  const labels: Record<AuthType, string> = {
    oauth: 'Connect with OAuth', api: 'API Integration', api_key: 'API Key Required',
    scraping: 'Username Required', manual: 'Manual Entry', none: 'No Connection Needed', hybrid: 'Multiple Options',
  };
  return labels[authType] || 'Unknown';
}

/** Get icon name for auth type */
export function getAuthTypeIcon(authType: AuthType): string {
  const icons: Record<AuthType, string> = {
    oauth: 'Link', api: 'Key', api_key: 'Key', scraping: 'User', manual: 'Edit', none: 'Check', hybrid: 'Settings',
  };
  return icons[authType] || 'HelpCircle';
}

/** Get sync interval in human-readable format */
export function getSyncIntervalLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
  if (minutes === 1440) return '1 day';
  return `${Math.round(minutes / 1440)} days`;
}

/** Get platform sync interval label */
export function getPlatformSyncIntervalLabel(platform: Platform): string {
  return getSyncIntervalLabel(platform.syncInterval || 1440);
}

/** Get connection difficulty level */
export function getConnectionDifficulty(platform: Platform): 'easy' | 'medium' | 'hard' {
  if (platform.authType === 'manual' || platform.authType === 'oauth' || platform.authType === 'scraping') return 'easy';
  if (platform.authType === 'api' && !platform.requiresCredentials) return 'easy';
  if (platform.authType === 'api_key' || platform.requiresCredentials) return 'medium';
  return 'easy';
}

/** Estimate sync duration */
export function estimateSyncDuration(platform: Platform): string {
  if (!platform.supportsAutoSync) return 'N/A (Manual)';
  if (platform.authType === 'oauth') return '5-10 seconds';
  if (platform.authType === 'api' || platform.authType === 'api_key') return '3-8 seconds';
  if (platform.authType === 'scraping') return '10-30 seconds';
  return 'Unknown';
}

/** Get platform emoji based on category */
export function getPlatformEmoji(platform: Platform): string {
  const emojis: Record<PlatformCategoryId, string> = {
    dsa: '💻',
    job: '💼',
    hackathon: '🏆',
    git: '🔀',
    learning: '📚',
    opensource: '❤️',
    company: '🏢',
    other: '🔗',
    design: '🎨',
    data_science: '📊',
  };
  return emojis[platform.category] || '🔗';
}

/** Get platform summary text */
export function getPlatformSummary(platform: Platform): string {
  const emoji = getPlatformEmoji(platform);
  const syncLabel = platform.supportsAutoSync ? '🔄 Auto-sync' : '✏️ Manual';
  const category = getCategoryById(platform.category)?.name || platform.category;
  return `${emoji} ${platform.name} | ${category} | ${syncLabel}`;
}

/** Format platform for display with fallbacks */
export function formatPlatformForDisplay(platform: Platform): {
  name: string; displayName: string; icon: string; color: string; description: string;
} {
  return {
    name: platform.name,
    displayName: platform.displayName || platform.name,
    icon: platform.icon || '/icons/default.svg',
    color: platform.color || '#6B7280',
    description: platform.description || `Track your progress on ${platform.name}`,
  };
}

/** Get platform connection steps */
export function getConnectionSteps(platform: Platform): string[] {
  switch (platform.authType) {
    case 'oauth':
      return [`Click "Connect with ${platform.name}"`, 'Authorize access in the popup', 'You will be redirected back'];
    case 'api': case 'api_key':
      return [`Go to ${platform.name} settings`, 'Generate an API key or token', 'Paste the key in the form'];
    case 'scraping':
      return [`Find your ${platform.name} username`, 'Enter username in the form', 'Make sure profile is public'];
    case 'manual':
      return ['No connection needed', 'Manually log your progress', 'Update entries regularly'];
    default:
      return [platform.setupInstructions || 'Follow setup instructions'];
  }
}

// -----------------------------------------------------------------------------
// 14. VALIDATION
// -----------------------------------------------------------------------------

/** Validate a single platform */
export function validatePlatform(platform: Platform): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!platform.id) errors.push('Missing id');
  if (!platform.name) errors.push('Missing name');
  if (!platform.slug) errors.push('Missing slug');
  if (!platform.category) errors.push('Missing category');
  if (!platform.authType) errors.push('Missing authType');
  if (platform.supportsAutoSync === undefined) errors.push('Missing supportsAutoSync');
  const duplicates = platforms.filter((p) => p.slug === platform.slug && p.id !== platform.id);
  if (duplicates.length > 0) errors.push(`Duplicate slug: ${platform.slug}`);
  return { valid: errors.length === 0, errors };
}

/** Validate all platforms */
export function validateAllPlatforms(): { valid: boolean; errors: Array<{ platform: string; errors: string[] }> } {
  const allErrors: Array<{ platform: string; errors: string[] }> = [];
  platforms.forEach((p) => {
    const validation = validatePlatform(p);
    if (!validation.valid) allErrors.push({ platform: p.id || p.name || 'Unknown', errors: validation.errors });
  });
  return { valid: allErrors.length === 0, errors: allErrors };
}

// -----------------------------------------------------------------------------
// 15. EXPORT FUNCTIONS
// -----------------------------------------------------------------------------

/** Export platforms to JSON string */
export function exportPlatformsToJSON(): string {
  return JSON.stringify({
    platforms, categories, stats: platformStats, exportedAt: new Date().toISOString(),
  }, null, 2);
}

// =============================================================================
// COMPUTED STATISTICS
// =============================================================================

/** Platform counts by category */
export const platformCounts = {
  dsa: platforms.filter((p) => p.category === 'dsa').length,
  job: platforms.filter((p) => p.category === 'job').length,
  hackathon: platforms.filter((p) => p.category === 'hackathon').length,
  git: platforms.filter((p) => p.category === 'git').length,
  learning: platforms.filter((p) => p.category === 'learning').length,
  opensource: platforms.filter((p) => p.category === 'opensource').length,
  company: platforms.filter((p) => p.category === 'company').length,
  total: platforms.length,
};

/** Complete platform statistics */
export const platformStats = {
  total: platforms.length,
  byCategory: platformCounts,
  byAuthType: {
    oauth: platforms.filter((p) => p.authType === 'oauth').length,
    api: platforms.filter((p) => p.authType === 'api' || p.authType === 'api_key').length,
    scraping: platforms.filter((p) => p.authType === 'scraping').length,
    manual: platforms.filter((p) => p.authType === 'manual').length,
  },
  autoSyncable: platforms.filter((p) => p.supportsAutoSync).length,
  manualOnly: platforms.filter((p) => !p.supportsAutoSync).length,
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default platforms;