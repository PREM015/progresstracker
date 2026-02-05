// src/app/api/email/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// =============================================================================
// TYPES
// =============================================================================

interface TemplateConfig {
  name: string;
  description: string;
  category: TemplateCategory;
  testData: Record<string, unknown>;
}

type TemplateCategory = 
  | 'authentication'
  | 'security'
  | 'streak'
  | 'goals'
  | 'achievements'
  | 'reports'
  | 'sync'
  | 'billing'
  | 'support'
  | 'marketing'
  | 'system';

// =============================================================================
// TEST DATA GENERATORS
// =============================================================================

const getBaseUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const generateTestToken = () => `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

const generateTestData = {
  // Authentication
  welcome: () => ({
    userName: 'Test User',
    email: 'test@example.com',
    onboardingUrl: `${getBaseUrl()}/onboarding`,
  }),

  verifyEmail: () => ({
    userName: 'Test User',
    verificationUrl: `${getBaseUrl()}/verify?token=${generateTestToken()}`,
    verificationCode: '123456',
    expiresIn: '24 hours',
  }),

  passwordReset: () => ({
    userName: 'Test User',
    resetUrl: `${getBaseUrl()}/reset-password?token=${generateTestToken()}`,
    expiresIn: '1 hour',
    ipAddress: '192.168.1.1',
    device: 'Chrome on Windows',
  }),

  passwordChanged: () => ({
    userName: 'Test User',
    changedAt: new Date().toISOString(),
    ipAddress: '192.168.1.1',
    device: 'Chrome on Windows',
    location: 'New York, US',
  }),

  emailChangeRequest: () => ({
    userName: 'Test User',
    currentEmail: 'old@example.com',
    newEmail: 'new@example.com',
    verificationUrl: `${getBaseUrl()}/confirm-email-change?token=${generateTestToken()}`,
    expiresIn: '24 hours',
    requestedAt: new Date().toISOString(),
    ipAddress: '192.168.1.1',
  }),

  emailChanged: () => ({
    userName: 'Test User',
    oldEmail: 'old@example.com',
    newEmail: 'new@example.com',
    changedAt: new Date().toISOString(),
    ipAddress: '192.168.1.1',
  }),

  // Security
  loginAlert: () => ({
    userName: 'Test User',
    loginTime: new Date().toISOString(),
    ipAddress: '192.168.1.1',
    device: 'Desktop',
    browser: 'Chrome 120',
    location: 'New York, US',
    isNewDevice: true,
    isNewLocation: false,
  }),

  twoFactorEnabled: () => ({
    userName: 'Test User',
    enabledAt: new Date().toISOString(),
    method: 'authenticator',
    ipAddress: '192.168.1.1',
    device: 'Chrome on Windows',
    backupCodesGenerated: true,
  }),

  twoFactorDisabled: () => ({
    userName: 'Test User',
    disabledAt: new Date().toISOString(),
    ipAddress: '192.168.1.1',
    device: 'Chrome on Windows',
  }),

  backupCodesGenerated: () => ({
    userName: 'Test User',
    generatedAt: new Date().toISOString(),
    codesCount: 10,
    ipAddress: '192.168.1.1',
  }),

  // Streaks
  streakAtRisk: () => ({
    userName: 'Test User',
    currentStreak: 15,
    hoursRemaining: 4,
    suggestedActions: [
      'Solve a quick LeetCode easy problem',
      'Make a small commit on GitHub',
      'Complete a lesson on Coursera',
    ],
  }),

  streakBroken: () => ({
    userName: 'Test User',
    brokenStreak: 30,
    longestStreak: 45,
    lastActivityDate: new Date(Date.now() - 86400000).toISOString(),
    encouragementMessage: "Don't give up! Every expert was once a beginner.",
  }),

  streakMilestone: () => ({
    userName: 'Test User',
    streakDays: 30,
    milestone: 30,
    nextMilestone: 50,
    totalActivities: 150,
    startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
  }),

  // Goals
  goalReminder: () => ({
    userName: 'Test User',
    goals: [
      {
        id: 'goal_1',
        title: 'Solve 100 LeetCode Problems',
        progress: 75,
        target: 100,
        unit: 'problems',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        daysRemaining: 7,
      },
      {
        id: 'goal_2',
        title: 'Complete React Course',
        progress: 60,
        target: 100,
        unit: 'percent',
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        daysRemaining: 14,
      },
    ],
    reminderType: 'daily' as const,
  }),

  goalCompleted: () => ({
    userName: 'Test User',
    goalTitle: 'Solve 100 LeetCode Problems',
    goalTarget: 100,
    goalUnit: 'problems',
    completedAt: new Date().toISOString(),
    daysToComplete: 45,
    xpEarned: 500,
    achievementUnlocked: 'Century Solver',
    nextSuggestedGoal: 'Solve 200 LeetCode Problems',
  }),

  // Achievements
  achievementUnlocked: () => ({
    userName: 'Test User',
    achievementTitle: 'Code Warrior',
    achievementDescription: 'Solved 100 problems across all platforms',
    achievementIcon: '🏆',
    tier: 'gold' as const,
    pointsEarned: 500,
    totalAchievements: 25,
  }),

  // Reports
  weeklyReport: () => ({
    userName: 'Test User',
    weekNumber: getWeekNumber(new Date()),
    year: new Date().getFullYear(),
    stats: {
      problemsSolved: 25,
      problemsChange: 15,
      commits: 42,
      commitsChange: 10,
      timeSpent: 1200, // minutes
      timeChange: 20,
      currentStreak: 15,
      longestStreak: 30,
      goalsCompleted: 2,
      goalsTotal: 5,
      rank: 150,
      rankChange: 25,
    },
    platformStats: [
      { name: 'LeetCode', icon: '💻', value: 15, label: 'problems' },
      { name: 'GitHub', icon: '🐙', value: 42, label: 'commits' },
      { name: 'HackerRank', icon: '🔥', value: 10, label: 'challenges' },
    ],
    topAchievement: 'Streak Master',
    motivationalQuote: 'The only way to do great work is to love what you do.',
  }),

  monthlyReport: () => ({
    userName: 'Test User',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    stats: {
      problemsSolved: 120,
      commits: 180,
      timeSpent: 4800, // minutes
      activeDays: 25,
      totalDays: 30,
      longestStreak: 15,
      goalsCompleted: 5,
      achievementsUnlocked: 3,
      topPlatform: 'LeetCode',
      topLanguage: 'TypeScript',
    },
    weeklyBreakdown: [
      { week: 1, problems: 30, commits: 45 },
      { week: 2, problems: 28, commits: 48 },
      { week: 3, problems: 35, commits: 42 },
      { week: 4, problems: 27, commits: 45 },
    ],
    improvements: [
      'Your problem-solving speed improved by 15%',
      'You maintained a consistent daily routine',
      'Your code quality metrics increased',
    ],
    downloadUrl: `${getBaseUrl()}/reports/monthly/${new Date().getFullYear()}/${new Date().getMonth() + 1}`,
  }),

  reportGenerated: () => ({
    userName: 'Test User',
    reportType: 'weekly' as const,
    reportId: `report_${Date.now()}`,
    periodStart: new Date(Date.now() - 7 * 86400000).toISOString(),
    periodEnd: new Date().toISOString(),
    stats: {
      problemsSolved: 25,
      commits: 42,
      timeSpent: 1200,
      streak: 15,
      goalsCompleted: 2,
      achievementsUnlocked: 1,
    },
    downloadUrl: `${getBaseUrl()}/reports/download/report_${Date.now()}`,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    highlights: [
      'Completed 25 problems this week',
      'Maintained 15-day streak',
      'Unlocked "Consistent Coder" achievement',
    ],
  }),

  // Sync
  syncFailed: () => ({
    userName: 'Test User',
    platformName: 'LeetCode',
    platformIcon: '💻',
    failureReason: 'API rate limit exceeded. Please try again later.',
    failedAt: new Date().toISOString(),
    consecutiveFailures: 3,
    suggestedActions: [
      'Wait for 1 hour before retrying',
      'Check if your LeetCode credentials are valid',
      'Verify your account is not locked',
    ],
  }),

  // Billing
  subscriptionCreated: () => ({
    userName: 'Test User',
    planName: 'Pro',
    planPrice: '$9.99',
    billingPeriod: 'monthly' as const,
    features: [
      'Unlimited platform connections',
      'Real-time sync',
      'Advanced analytics',
      'Priority support',
      'Custom reports',
    ],
    nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    trialEnds: new Date(Date.now() + 14 * 86400000).toISOString(),
  }),

  subscriptionCancelled: () => ({
    userName: 'Test User',
    planName: 'Pro',
    cancelledAt: new Date().toISOString(),
    accessEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    reason: 'Too expensive',
    feedbackUrl: `${getBaseUrl()}/feedback/subscription`,
  }),

  paymentFailed: () => ({
    userName: 'Test User',
    planName: 'Pro',
    amount: '$9.99',
    failedAt: new Date().toISOString(),
    failureReason: 'Card declined - insufficient funds',
    retryDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    gracePeriodEnds: new Date(Date.now() + 7 * 86400000).toISOString(),
    paymentMethodLast4: '4242',
  }),

  invoicePaid: () => ({
    userName: 'Test User',
    invoiceNumber: `INV-${Date.now()}`,
    invoiceDate: new Date().toISOString(),
    amount: '$9.99',
    paymentMethod: 'Visa',
    paymentMethodLast4: '4242',
    planName: 'Pro',
    billingPeriodStart: new Date().toISOString(),
    billingPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    items: [
      { description: 'ProgressTracker Pro - Monthly', amount: '$9.99' },
    ],
    invoiceUrl: `${getBaseUrl()}/billing/invoices/INV-${Date.now()}`,
    nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  }),

  // Account
  accountDeleted: () => ({
    userName: 'Test User',
    email: 'test@example.com',
    deletedAt: new Date().toISOString(),
    dataRetentionDays: 30,
    feedbackUrl: `${getBaseUrl()}/feedback/deletion`,
  }),

  // Support
  supportTicketCreated: () => ({
    userName: 'Test User',
    ticketNumber: `TKT-${Date.now()}`,
    ticketId: `ticket_${Date.now()}`,
    subject: 'Cannot sync LeetCode data',
    category: 'Technical Issue',
    priority: 'medium' as const,
    description: 'I am unable to sync my LeetCode data. The sync keeps failing with a timeout error.',
    expectedResponseTime: '24 hours',
  }),

  supportTicketReply: () => ({
    userName: 'Test User',
    ticketNumber: `TKT-${Date.now()}`,
    ticketId: `ticket_${Date.now()}`,
    subject: 'Cannot sync LeetCode data',
    replierName: 'Support Team',
    isStaffReply: true,
    replyContent: 'Thank you for reporting this issue. We have identified the problem and are working on a fix. In the meantime, please try disconnecting and reconnecting your LeetCode account.',
    repliedAt: new Date().toISOString(),
    previousMessages: [
      {
        author: 'Test User',
        content: 'I am unable to sync my LeetCode data. The sync keeps failing with a timeout error.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        isStaff: false,
      },
    ],
  }),

  // Marketing
  newsletter: () => ({
    subscriberName: 'Test User',
    subject: 'ProgressTracker Weekly Digest',
    introText: 'Here\'s what\'s new this week in the world of coding and career growth.',
    articles: [
      {
        title: '10 Tips to Ace Your Technical Interview',
        excerpt: 'Master these essential strategies to stand out in your next technical interview.',
        url: `${getBaseUrl()}/blog/technical-interview-tips`,
        image: `${getBaseUrl()}/images/blog/interview.jpg`,
        category: 'Career',
      },
      {
        title: 'New LeetCode Integration Features',
        excerpt: 'We\'ve added new features to help you track your LeetCode progress better.',
        url: `${getBaseUrl()}/blog/leetcode-integration`,
        category: 'Product',
      },
    ],
    tips: [
      'Try solving at least one problem every day to maintain your streak',
      'Review your weekly reports to identify areas for improvement',
    ],
    unsubscribeToken: generateTestToken(),
  }),

  waitlistWelcome: () => ({
    email: 'test@example.com',
    name: 'Test User',
    position: 142,
    referralCode: 'REF_TEST123',
    estimatedLaunchDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    features: [
      'Track progress across 50+ coding platforms',
      'Set and achieve personalized goals',
      'Earn achievements and compete on leaderboards',
      'Get weekly progress reports',
    ],
  }),

  // System
  maintenanceNotification: () => ({
    userName: 'Test User',
    maintenanceTitle: 'Scheduled Maintenance',
    maintenanceDescription: 'We will be performing scheduled maintenance to improve our services. During this time, syncing and some features may be temporarily unavailable.',
    startTime: new Date(Date.now() + 2 * 86400000).toISOString(),
    endTime: new Date(Date.now() + 2 * 86400000 + 4 * 3600000).toISOString(),
    affectedServices: ['Platform Sync', 'Data Export', 'API Access'],
    isEmergency: false,
  }),
};

// =============================================================================
// TEMPLATE CONFIGURATIONS
// =============================================================================

const templateConfigs: Record<string, TemplateConfig> = {
  // Authentication
  welcome: {
    name: 'Welcome Email',
    description: 'Sent when a new user signs up',
    category: 'authentication',
    testData: generateTestData.welcome(),
  },
  'verify-email': {
    name: 'Verify Email',
    description: 'Sent to verify user email address',
    category: 'authentication',
    testData: generateTestData.verifyEmail(),
  },
  'password-reset': {
    name: 'Password Reset',
    description: 'Sent when user requests password reset',
    category: 'authentication',
    testData: generateTestData.passwordReset(),
  },
  'password-changed': {
    name: 'Password Changed',
    description: 'Sent after password is successfully changed',
    category: 'authentication',
    testData: generateTestData.passwordChanged(),
  },
  'email-change-request': {
    name: 'Email Change Request',
    description: 'Sent when user requests to change email',
    category: 'authentication',
    testData: generateTestData.emailChangeRequest(),
  },
  'email-changed': {
    name: 'Email Changed',
    description: 'Sent after email is successfully changed',
    category: 'authentication',
    testData: generateTestData.emailChanged(),
  },

  // Security
  'login-alert': {
    name: 'Login Alert',
    description: 'Sent when a new login is detected',
    category: 'security',
    testData: generateTestData.loginAlert(),
  },
  '2fa-enabled': {
    name: '2FA Enabled',
    description: 'Sent when two-factor authentication is enabled',
    category: 'security',
    testData: generateTestData.twoFactorEnabled(),
  },
  '2fa-disabled': {
    name: '2FA Disabled',
    description: 'Sent when two-factor authentication is disabled',
    category: 'security',
    testData: generateTestData.twoFactorDisabled(),
  },
  'backup-codes-generated': {
    name: 'Backup Codes Generated',
    description: 'Sent when new backup codes are generated',
    category: 'security',
    testData: generateTestData.backupCodesGenerated(),
  },

  // Streaks
  'streak-at-risk': {
    name: 'Streak at Risk',
    description: 'Sent when user streak is about to break',
    category: 'streak',
    testData: generateTestData.streakAtRisk(),
  },
  'streak-broken': {
    name: 'Streak Broken',
    description: 'Sent when user streak is broken',
    category: 'streak',
    testData: generateTestData.streakBroken(),
  },
  'streak-milestone': {
    name: 'Streak Milestone',
    description: 'Sent when user reaches a streak milestone',
    category: 'streak',
    testData: generateTestData.streakMilestone(),
  },

  // Goals
  'goal-reminder': {
    name: 'Goal Reminder',
    description: 'Sent to remind user about their goals',
    category: 'goals',
    testData: generateTestData.goalReminder(),
  },
  'goal-completed': {
    name: 'Goal Completed',
    description: 'Sent when user completes a goal',
    category: 'goals',
    testData: generateTestData.goalCompleted(),
  },

  // Achievements
  'achievement-unlocked': {
    name: 'Achievement Unlocked',
    description: 'Sent when user unlocks an achievement',
    category: 'achievements',
    testData: generateTestData.achievementUnlocked(),
  },

  // Reports
  'weekly-report': {
    name: 'Weekly Report',
    description: 'Sent as weekly progress summary',
    category: 'reports',
    testData: generateTestData.weeklyReport(),
  },
  'monthly-report': {
    name: 'Monthly Report',
    description: 'Sent as monthly progress summary',
    category: 'reports',
    testData: generateTestData.monthlyReport(),
  },
  'report-generated': {
    name: 'Report Generated',
    description: 'Sent when a custom report is generated',
    category: 'reports',
    testData: generateTestData.reportGenerated(),
  },

  // Sync
  'sync-failed': {
    name: 'Sync Failed',
    description: 'Sent when platform sync fails',
    category: 'sync',
    testData: generateTestData.syncFailed(),
  },

  // Billing
  'subscription-created': {
    name: 'Subscription Created',
    description: 'Sent when a new subscription is created',
    category: 'billing',
    testData: generateTestData.subscriptionCreated(),
  },
  'subscription-cancelled': {
    name: 'Subscription Cancelled',
    description: 'Sent when subscription is cancelled',
    category: 'billing',
    testData: generateTestData.subscriptionCancelled(),
  },
  'payment-failed': {
    name: 'Payment Failed',
    description: 'Sent when payment fails',
    category: 'billing',
    testData: generateTestData.paymentFailed(),
  },
  'invoice-paid': {
    name: 'Invoice Paid',
    description: 'Sent when invoice is successfully paid',
    category: 'billing',
    testData: generateTestData.invoicePaid(),
  },

  // Account
  'account-deleted': {
    name: 'Account Deleted',
    description: 'Sent when account is deleted',
    category: 'system',
    testData: generateTestData.accountDeleted(),
  },

  // Support
  'support-ticket-created': {
    name: 'Support Ticket Created',
    description: 'Sent when support ticket is created',
    category: 'support',
    testData: generateTestData.supportTicketCreated(),
  },
  'support-ticket-reply': {
    name: 'Support Ticket Reply',
    description: 'Sent when there is a reply on support ticket',
    category: 'support',
    testData: generateTestData.supportTicketReply(),
  },

  // Marketing
  newsletter: {
    name: 'Newsletter',
    description: 'Weekly or monthly newsletter',
    category: 'marketing',
    testData: generateTestData.newsletter(),
  },
  'waitlist-welcome': {
    name: 'Waitlist Welcome',
    description: 'Sent when user joins waitlist',
    category: 'marketing',
    testData: generateTestData.waitlistWelcome(),
  },

  // System
  'maintenance-notification': {
    name: 'Maintenance Notification',
    description: 'Sent before scheduled maintenance',
    category: 'system',
    testData: generateTestData.maintenanceNotification(),
  },
};

// =============================================================================
// EMAIL SENDER MAPPING
// =============================================================================

type EmailSenderFn = (email: string, data: Record<string, unknown>) => Promise<{ success: boolean; messageId?: string; error?: string; provider?: string }>;

const emailSenders: Record<string, EmailSenderFn> = {
  'welcome': (email, data) => emailService.sendWelcome(email, data as Parameters<typeof emailService.sendWelcome>[1]),
  'verify-email': (email, data) => emailService.sendVerificationEmail(email, data as Parameters<typeof emailService.sendVerificationEmail>[1]),
  'password-reset': (email, data) => emailService.sendPasswordResetEmail(email, data as Parameters<typeof emailService.sendPasswordResetEmail>[1]),
  'password-changed': (email, data) => emailService.sendPasswordChangedEmail(email, data as Parameters<typeof emailService.sendPasswordChangedEmail>[1]),
  'email-change-request': (email, data) => emailService.sendEmailChangeRequest(email, data as Parameters<typeof emailService.sendEmailChangeRequest>[1]),
  'email-changed': (email, data) => emailService.sendEmailChanged(email, data as Parameters<typeof emailService.sendEmailChanged>[1]),
  'login-alert': (email, data) => emailService.sendLoginAlert(email, data as Parameters<typeof emailService.sendLoginAlert>[1]),
  '2fa-enabled': (email, data) => emailService.sendTwoFactorEnabled(email, data as Parameters<typeof emailService.sendTwoFactorEnabled>[1]),
  '2fa-disabled': (email, data) => emailService.sendTwoFactorDisabled(email, data as Parameters<typeof emailService.sendTwoFactorDisabled>[1]),
  'backup-codes-generated': (email, data) => emailService.sendBackupCodesGenerated(email, data as Parameters<typeof emailService.sendBackupCodesGenerated>[1]),
  'streak-at-risk': (email, data) => emailService.sendStreakAtRisk(email, data as Parameters<typeof emailService.sendStreakAtRisk>[1]),
  'streak-broken': (email, data) => emailService.sendStreakBroken(email, data as Parameters<typeof emailService.sendStreakBroken>[1]),
  'streak-milestone': (email, data) => emailService.sendStreakMilestone(email, data as Parameters<typeof emailService.sendStreakMilestone>[1]),
  'goal-reminder': (email, data) => emailService.sendGoalReminder(email, data as Parameters<typeof emailService.sendGoalReminder>[1]),
  'goal-completed': (email, data) => emailService.sendGoalCompleted(email, data as Parameters<typeof emailService.sendGoalCompleted>[1]),
  'achievement-unlocked': (email, data) => emailService.sendAchievementUnlocked(email, data as Parameters<typeof emailService.sendAchievementUnlocked>[1]),
  'weekly-report': (email, data) => emailService.sendWeeklyReport(email, data as Parameters<typeof emailService.sendWeeklyReport>[1]),
  'monthly-report': (email, data) => emailService.sendMonthlyReport(email, data as Parameters<typeof emailService.sendMonthlyReport>[1]),
  'report-generated': (email, data) => emailService.sendReportGenerated(email, data as Parameters<typeof emailService.sendReportGenerated>[1]),
  'sync-failed': (email, data) => emailService.sendSyncFailed(email, data as Parameters<typeof emailService.sendSyncFailed>[1]),
  'subscription-created': (email, data) => emailService.sendSubscriptionCreated(email, data as Parameters<typeof emailService.sendSubscriptionCreated>[1]),
  'subscription-cancelled': (email, data) => emailService.sendSubscriptionCancelled(email, data as Parameters<typeof emailService.sendSubscriptionCancelled>[1]),
  'payment-failed': (email, data) => emailService.sendPaymentFailed(email, data as Parameters<typeof emailService.sendPaymentFailed>[1]),
  'invoice-paid': (email, data) => emailService.sendInvoicePaid(email, data as Parameters<typeof emailService.sendInvoicePaid>[1]),
  'account-deleted': (email, data) => emailService.sendAccountDeleted(email, data as Parameters<typeof emailService.sendAccountDeleted>[1]),
  'support-ticket-created': (email, data) => emailService.sendSupportTicketCreated(email, data as Parameters<typeof emailService.sendSupportTicketCreated>[1]),
  'support-ticket-reply': (email, data) => emailService.sendSupportTicketReply(email, data as Parameters<typeof emailService.sendSupportTicketReply>[1]),
  'newsletter': (email, data) => emailService.sendNewsletter(email, data as Parameters<typeof emailService.sendNewsletter>[1]),
  'waitlist-welcome': (email, data) => emailService.sendWaitlistWelcome(email, data as Parameters<typeof emailService.sendWaitlistWelcome>[1]),
  'maintenance-notification': (email, data) => emailService.sendMaintenanceNotification(email, data as Parameters<typeof emailService.sendMaintenanceNotification>[1]),
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function groupTemplatesByCategory(): Record<TemplateCategory, Array<{ key: string; config: TemplateConfig }>> {
  const grouped: Record<TemplateCategory, Array<{ key: string; config: TemplateConfig }>> = {
    authentication: [],
    security: [],
    streak: [],
    goals: [],
    achievements: [],
    reports: [],
    sync: [],
    billing: [],
    support: [],
    marketing: [],
    system: [],
  };

  for (const [key, config] of Object.entries(templateConfigs)) {
    grouped[config.category].push({ key, config });
  }

  return grouped;
}

async function checkAuth(request: NextRequest): Promise<{ authorized: boolean; error?: string }> {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    return { authorized: true };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return { authorized: false, error: 'Unauthorized - Admin access required' };
  }

  return { authorized: true };
}

// =============================================================================
// GET - List all available templates
// =============================================================================

export async function GET(request: NextRequest) {
  const authResult = await checkAuth(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as TemplateCategory | null;

  try {
    const grouped = groupTemplatesByCategory();

    // If category specified, return only that category
    if (category && grouped[category]) {
      return NextResponse.json({
        success: true,
        category,
        templates: grouped[category].map(({ key, config }) => ({
          key,
          name: config.name,
          description: config.description,
        })),
      });
    }

    // Return all templates grouped by category
    const response: Record<string, Array<{ key: string; name: string; description: string }>> = {};
    
    for (const [cat, templates] of Object.entries(grouped)) {
      if (templates.length > 0) {
        response[cat] = templates.map(({ key, config }) => ({
          key,
          name: config.name,
          description: config.description,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      totalTemplates: Object.keys(templateConfigs).length,
      categories: Object.keys(grouped).filter(cat => grouped[cat as TemplateCategory].length > 0),
      templates: response,
    });
  } catch (error) {
    logger.error('Failed to get email templates', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Send test email(s)
// =============================================================================

export async function POST(request: NextRequest) {
  const authResult = await checkAuth(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      email, 
      template, 
      templates, 
      category, 
      all = false,
      customData,
      delay = 500, // Delay between emails in ms to avoid rate limiting
    } = body;

    // Validate email
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Determine which templates to send
    let templatesToSend: string[] = [];

    if (all) {
      // Send all templates
      templatesToSend = Object.keys(templateConfigs);
    } else if (category) {
      // Send all templates in a category
      const grouped = groupTemplatesByCategory();
      if (!grouped[category as TemplateCategory]) {
        return NextResponse.json(
          { success: false, error: `Invalid category: ${category}` },
          { status: 400 }
        );
      }
      templatesToSend = grouped[category as TemplateCategory].map(t => t.key);
    } else if (templates && Array.isArray(templates)) {
      // Send specific templates
      templatesToSend = templates;
    } else if (template) {
      // Send single template
      templatesToSend = [template];
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Specify template, templates array, category, or all=true' 
        },
        { status: 400 }
      );
    }

    // Validate all templates exist
    const invalidTemplates = templatesToSend.filter(t => !templateConfigs[t]);
    if (invalidTemplates.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid templates: ${invalidTemplates.join(', ')}`,
          availableTemplates: Object.keys(templateConfigs),
        },
        { status: 400 }
      );
    }

    // Send emails
    const results: Array<{
      template: string;
      name: string;
      success: boolean;
      messageId?: string;
      error?: string;
      duration: number;
    }> = [];

    for (let i = 0; i < templatesToSend.length; i++) {
      const templateKey = templatesToSend[i];
      const config = templateConfigs[templateKey];
      const sender = emailSenders[templateKey];

      if (!sender) {
        results.push({
          template: templateKey,
          name: config.name,
          success: false,
          error: 'Email sender not implemented',
          duration: 0,
        });
        continue;
      }

      // Use custom data if provided, otherwise use test data
      const data = customData?.[templateKey] || config.testData;

      const startTime = Date.now();
      
      try {
        const result = await sender(email, data);
        
        results.push({
          template: templateKey,
          name: config.name,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          template: templateKey,
          name: config.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime,
        });
      }

      // Add delay between emails to avoid rate limiting
      if (i < templatesToSend.length - 1 && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Calculate summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    logger.info('Test emails sent', {
      email,
      templatesRequested: templatesToSend.length,
      successful: successful.length,
      failed: failed.length,
      totalDuration,
    });

    return NextResponse.json({
      success: failed.length === 0,
      summary: {
        email,
        totalRequested: templatesToSend.length,
        successful: successful.length,
        failed: failed.length,
        totalDuration: `${totalDuration}ms`,
      },
      results,
      ...(failed.length > 0 && {
        failedTemplates: failed.map(f => ({
          template: f.template,
          error: f.error,
        })),
      }),
    });
  } catch (error) {
    logger.error('Failed to send test email', {}, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Clear email test cache (if implementing caching)
// =============================================================================

export async function DELETE(request: NextRequest) {
  const authResult = await checkAuth(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  // Placeholder for cache clearing functionality
  return NextResponse.json({
    success: true,
    message: 'Email test cache cleared (no caching implemented)',
  });
}