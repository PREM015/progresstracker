// ===== FILE: src/types/user.ts =====
// Complete user types matching Prisma schema

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** User role */
export type UserRole = 'user' | 'moderator' | 'admin' | 'superadmin';

/** Account status */
export type AccountStatus = 'active' | 'inactive' | 'banned' | 'suspended' | 'deleted';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Main User interface */
export interface User {
  id: string;
  
  // Basic Info
  name?: string;
  email?: string;
  emailVerified?: Date;
  username?: string;
  image?: string;
  
  // Profile
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  jobTitle?: string;
  
  // Social Links
  githubUsername?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  discordUsername?: string;
  
  // Visibility Settings
  isPublic: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showActivity: boolean;
  showAchievements: boolean;
  showGoals: boolean;
  showPlatforms: boolean;
  showStreak: boolean;
  
  // Account Status
  isActive: boolean;
  isVerified: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: Date;
  bannedBy?: string;
  
  // Admin & Roles
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: UserRole;
  permissions: string[];
  
  // Streak Data
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: Date;
  streakStartDate?: Date;
  streakFreezeCount: number;
  streakFreezeUsedAt?: Date;
  
  // Stats
  totalProblems: number;
  totalCommits: number;
  totalProjects: number;
  totalCertifications: number;
  totalAchievements: number;
  totalPoints: number;
  rank?: number;
  
  // Preferences
  preferredLanguage: string;
  timezone: string;
  
  // Metadata
  signupSource?: string;
  referralCode?: string;
  referredBy?: string;
  
  // Timestamps
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/** User profile (public view) */
export interface UserProfile {
  id: string;
  username?: string;
  name?: string;
  image?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  jobTitle?: string;
  
  // Social (if showEmail is true)
  githubUsername?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  
  // Stats (if visible)
  currentStreak?: number;
  longestStreak?: number;
  totalProblems?: number;
  totalCommits?: number;
  totalAchievements?: number;
  totalPoints?: number;
  rank?: number;
  
  // Achievements (if showAchievements is true)
  pinnedAchievements?: Array<{
    id: string;
    title: string;
    icon: string;
    rarity: string;
    unlockedAt: Date;
  }>;
  
  // Activity (if showActivity is true)
  recentActivity?: Array<{
    date: Date;
    type: string;
    value: number;
  }>;
  
  // Platforms (if showPlatforms is true)
  connectedPlatforms?: Array<{
    slug: string;
    name: string;
    icon?: string;
    profileUrl?: string;
  }>;
  
  // Timestamps
  memberSince: Date;
  lastActive?: Date;
}

/** User session */
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  
  // Device Info
  userAgent?: string;
  ipAddress?: string;
  device?: string;
  deviceModel?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  
  // Location
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  
  // Status
  isValid: boolean;
  isCurrent: boolean;
  
  // Activity
  lastActiveAt: Date;
  expiresAt: Date;
  
  createdAt: Date;
}

/** User stats summary */
export interface UserStats {
  problems: {
    total: number;
    easy: number;
    medium: number;
    hard: number;
    thisWeek: number;
    thisMonth: number;
  };
  commits: {
    total: number;
    thisWeek: number;
    thisMonth: number;
  };
  streak: {
    current: number;
    longest: number;
    startDate?: Date;
  };
  activity: {
    totalDays: number;
    activeDays: number;
    rate: number;
  };
  achievements: {
    total: number;
    unlocked: number;
    points: number;
  };
  goals: {
    total: number;
    active: number;
    completed: number;
    completionRate: number;
  };
  platforms: {
    connected: number;
    total: number;
  };
  rank?: number;
  percentile?: number;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create user input */
export interface CreateUserInput {
  email: string;
  password?: string;
  name?: string;
  username?: string;
  image?: string;
  signupSource?: string;
  referralCode?: string;
}

/** Update user input */
export interface UpdateUserInput {
  name?: string;
  username?: string;
  image?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  jobTitle?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  discordUsername?: string;
}

/** Update user profile input */
export interface UpdateProfileInput {
  name?: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  jobTitle?: string;
  image?: string;
}

/** Update privacy settings input */
export interface UpdatePrivacyInput {
  isPublic?: boolean;
  showEmail?: boolean;
  showLocation?: boolean;
  showActivity?: boolean;
  showAchievements?: boolean;
  showGoals?: boolean;
  showPlatforms?: boolean;
  showStreak?: boolean;
}

/** Change password input */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Delete account input */
export interface DeleteAccountInput {
  password: string;
  reason?: string;
  feedback?: string;
}

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

/** Login credentials */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/** Register credentials */
export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
  username?: string;
  acceptTerms: boolean;
}

/** Auth result */
export interface AuthResult {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  requiresTwoFactor?: boolean;
  error?: string;
}

/** Password reset request */
export interface PasswordResetRequest {
  email: string;
}

/** Password reset confirmation */
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/** Two-factor auth setup */
export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/** Two-factor verification */
export interface TwoFactorVerify {
  code: string;
  userId: string;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Role configuration */
export const ROLE_CONFIG: Record<UserRole, {
  label: string;
  color: string;
  permissions: string[];
}> = {
  user: {
    label: 'User',
    color: '#6B7280',
    permissions: ['read:own', 'write:own'],
  },
  moderator: {
    label: 'Moderator',
    color: '#3B82F6',
    permissions: ['read:own', 'write:own', 'read:users', 'moderate:content'],
  },
  admin: {
    label: 'Admin',
    color: '#8B5CF6',
    permissions: ['read:all', 'write:all', 'manage:users', 'manage:content'],
  },
  superadmin: {
    label: 'Super Admin',
    color: '#EF4444',
    permissions: ['*'],
  },
};

/** Account status configuration */
export const STATUS_CONFIG: Record<AccountStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  active: { label: 'Active', color: '#10B981', bgColor: '#D1FAE5', icon: 'CheckCircle' },
  inactive: { label: 'Inactive', color: '#6B7280', bgColor: '#F3F4F6', icon: 'Clock' },
  banned: { label: 'Banned', color: '#EF4444', bgColor: '#FEE2E2', icon: 'Ban' },
  suspended: { label: 'Suspended', color: '#F59E0B', bgColor: '#FEF3C7', icon: 'AlertTriangle' },
  deleted: { label: 'Deleted', color: '#6B7280', bgColor: '#F3F4F6', icon: 'Trash' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get user display name */
export function getUserDisplayName(user: User | UserProfile): string {
  return user.name || user.username || 'Anonymous';
}

/** Get user initials */
export function getUserInitials(user: User | UserProfile): string {
  const name = getUserDisplayName(user);
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/** Check if user has permission */
export function hasPermission(user: User, permission: string): boolean {
  if (user.isSuperAdmin) return true;
  if (user.permissions.includes('*')) return true;
  return user.permissions.includes(permission);
}

/** Check if user is admin */
export function isAdmin(user: User): boolean {
  return user.isAdmin || user.isSuperAdmin || user.role === 'admin' || user.role === 'superadmin';
}

/** Get account status */
export function getAccountStatus(user: User): AccountStatus {
  if (user.deletedAt) return 'deleted';
  if (user.isBanned) return 'banned';
  if (!user.isActive) return 'inactive';
  return 'active';
}

/** Calculate member duration */
export function getMemberDuration(createdAt: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} years`;
}

/** Validate username */
export function isValidUsername(username: string): { valid: boolean; error?: string } {
  if (!username) return { valid: false, error: 'Username is required' };
  if (username.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
  if (username.length > 30) return { valid: false, error: 'Username must be less than 30 characters' };
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  return { valid: true };
}

/** Validate password strength */
export function validatePassword(password: string): { valid: boolean; strength: number; errors: string[] } {
  const errors: string[] = [];
  let strength = 0;
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else {
    strength += 1;
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  } else {
    strength += 1;
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  } else {
    strength += 1;
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  } else {
    strength += 1;
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password should contain a special character');
  } else {
    strength += 1;
  }
  
  return {
    valid: errors.length === 0,
    strength: Math.min(5, strength),
    errors,
  };
}

export default User;