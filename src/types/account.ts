// src/types/account.ts
// OAuth account types matching Prisma schema

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type OAuthProvider =
  | 'github'
  | 'google'
  | 'discord'
  | 'twitter'
  | 'linkedin'
  | 'gitlab'
  | 'bitbucket';

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  'github',
  'google',
  'discord',
  'twitter',
  'linkedin',
  'gitlab',
  'bitbucket',
];

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** OAuth account linked to a user (matches Prisma Account model) */
export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string | null;
  access_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Lightweight account summary for display */
export interface AccountSummary {
  id: string;
  provider: string;
  providerAccountId: string;
  createdAt: Date;
}

/** Account with user relation */
export interface AccountWithUser extends Account {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

// =============================================================================
// INPUT/REQUEST TYPES
// =============================================================================

/** Link OAuth account input */
export interface LinkAccountInput {
  provider: OAuthProvider;
  providerAccountId: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

/** Unlink OAuth account input */
export interface UnlinkAccountInput {
  provider: string;
  providerAccountId: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/** Connected accounts summary for user profile */
export interface ConnectedAccountsResponse {
  accounts: AccountSummary[];
  total: number;
  providers: string[];
  canUnlink: boolean; // false if only one auth method
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Check if provider is valid OAuth provider */
export function isValidOAuthProvider(provider: string): provider is OAuthProvider {
  return OAUTH_PROVIDERS.includes(provider as OAuthProvider);
}

/** Get provider display label */
export function getProviderLabel(provider: string): string {
  const labels: Record<string, string> = {
    github: 'GitHub',
    google: 'Google',
    discord: 'Discord',
    twitter: 'Twitter / X',
    linkedin: 'LinkedIn',
    gitlab: 'GitLab',
    bitbucket: 'Bitbucket',
  };
  return labels[provider] ?? provider;
}

export default Account;
