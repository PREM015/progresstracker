// ===== FILE: src/types/oauth.ts =====
// Complete OAuth types for authentication

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Supported OAuth providers */
export type OAuthProviderType = 
  | 'google'
  | 'github'
  | 'linkedin'
  | 'twitter'
  | 'facebook'
  | 'discord'
  | 'gitlab'
  | 'bitbucket'
  | 'microsoft';

/** OAuth grant types */
export type OAuthGrantType = 
  | 'authorization_code'
  | 'refresh_token'
  | 'client_credentials'
  | 'password';

/** Token type */
export type TokenType = 'Bearer' | 'Basic' | 'MAC';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** OAuth provider configuration */
export interface OAuthProvider {
  id: OAuthProviderType;
  name: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string[];
  scopeDelimiter: string;
  redirectUri: string;
  responseType: string;
  grantType: OAuthGrantType;
  pkce: boolean;
  state: boolean;
  icon: string;
  color: string;
  bgColor: string;
}

/** OAuth tokens */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: TokenType;
  scope?: string;
  expiresIn?: number;
  expiresAt?: Date;
  issuedAt: Date;
}

/** OAuth state for CSRF protection */
export interface OAuthState {
  state: string;
  codeVerifier?: string;
  redirectUrl?: string;
  provider: OAuthProviderType;
  action: 'login' | 'register' | 'link';
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

/** OAuth callback data */
export interface OAuthCallback {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
  provider: OAuthProviderType;
}

/** OAuth user profile (normalized) */
export interface OAuthProfile {
  id: string;
  provider: OAuthProviderType;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  avatar?: string;
  profileUrl?: string;
  locale?: string;
  timezone?: string;
  raw: Record<string, unknown>;
}

/** OAuth authorization request */
export interface OAuthAuthorizationRequest {
  provider: OAuthProviderType;
  scope?: string[];
  state?: string;
  redirectUri?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  prompt?: 'none' | 'consent' | 'select_account';
  loginHint?: string;
  accessType?: 'online' | 'offline';
}

/** OAuth token request */
export interface OAuthTokenRequest {
  provider: OAuthProviderType;
  grantType: OAuthGrantType;
  code?: string;
  refreshToken?: string;
  redirectUri?: string;
  codeVerifier?: string;
  scope?: string[];
}

/** OAuth token response */
export interface OAuthTokenResponse {
  success: boolean;
  tokens?: OAuthTokens;
  profile?: OAuthProfile;
  error?: string;
  errorDescription?: string;
}

/** Linked OAuth account */
export interface LinkedOAuthAccount {
  id: string;
  provider: OAuthProviderType;
  providerAccountId: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  profileUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scope?: string;
  linkedAt: Date;
  lastUsedAt?: Date;
}

// =============================================================================
// PROVIDER CONFIGURATIONS
// =============================================================================

/** Provider-specific configurations */
export const OAUTH_PROVIDERS: Record<OAuthProviderType, Partial<OAuthProvider>> = {
  google: {
    id: 'google',
    name: 'google',
    displayName: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scope: ['openid', 'email', 'profile'],
    scopeDelimiter: ' ',
    responseType: 'code',
    grantType: 'authorization_code',
    pkce: true,
    state: true,
    icon: '/icons/google.svg',
    color: '#4285F4',
    bgColor: '#FFFFFF',
  },
  github: {
    id: 'github',
    name: 'github',
    displayName: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: ['read:user', 'user:email'],
    scopeDelimiter: ' ',
    responseType: 'code',
    grantType: 'authorization_code',
    pkce: false,
    state: true,
    icon: '/icons/github.svg',
    color: '#181717',
    bgColor: '#FFFFFF',
  },
  linkedin: {
    id: 'linkedin',
    name: 'linkedin',
    displayName: 'LinkedIn',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scope: ['openid', 'profile', 'email'],
    scopeDelimiter: ' ',
    responseType: 'code',
    grantType: 'authorization_code',
    pkce: true,
    state: true,
    icon: '/icons/linkedin.svg',
    color: '#0A66C2',
    bgColor: '#FFFFFF',
  },
  twitter: {
    id: 'twitter',
    name: 'twitter',
    displayName: 'Twitter',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userInfoUrl: 'https://api.twitter.com/2/users/me',
    scope: ['tweet.read', 'users.read'],
    scopeDelimiter: ' ',
    responseType: 'code',
    grantType: 'authorization_code',
    pkce: true,
    state: true,
    icon: '/icons/twitter.svg',
    color: '#1DA1F2',
    bgColor: '#FFFFFF',
  },
  facebook: {
    id: 'facebook',
    name: 'facebook',
    displayName: 'Facebook',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/me',
    scope: ['email', 'public_profile'],
    scopeDelimiter: ',',
    responseType: 'code',
    grantType: 'authorization_code',
    pkce: false,
    state: true,
    icon: '/icons/facebook.svg',
    color: '#1877F2',
    bgColor: '#FFFFFF',
  },
  discord: {
    id: 'discord',
    name: 'discord',
    displayName: 'Discord',
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    scope: ['identify', 'email'],
    scopeDelimiter: ' ',
    responseType: 'code',
    grantType: 'authorization_code',
    pkce: false,
    state: true,
    icon: '/icons/discord.svg',
    color: '#5865F2',
    bgColor: '#FFFFFF',
  },
  gitlab: {
    id: 'gitlab',
    name: 'gitlab',
    displayName: 'GitLab',
    authUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    userInfoUrl: 'https://gitlab.com/api/v4/user',
    scope: ['read_user'],
    scopeDelimiter: ' ',
    responseType: 'code',
    grantType: 'authorization_code',
    pkce: true,
    state: true,
    icon: '/icons/gitlab.svg',
    color: '#FC6D26',
    bgColor: '#FFFFFF',
  },
  bitbucket: {
    id: 'bitbucket',
    name: 'bitbucket',
    displayName: 'Bitbucket',
    authUrl: 'https://bitbucket.org/site/oauth2/authorize',
    tokenUrl: 'https://bitbucket.org/site/oauth2/access_token',
    userInfoUrl: 'https://api.bitbucket.org/2.0/user',
    scope: ['account'],
    scopeDelimiter: ' ',
    responseType: 'code',
    grantType: 'authorization_code',
    pkce: false,
    state: true,
    icon: '/icons/bitbucket.svg',
    color: '#0052CC',
    bgColor: '#FFFFFF',
  },
  microsoft: {
    id: 'microsoft',
    name: 'microsoft',
    displayName: 'Microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: ['openid', 'email', 'profile'],
    scopeDelimiter: ' ',
    responseType: 'code',
    grantType: 'authorization_code',
    pkce: true,
    state: true,
    icon: '/icons/microsoft.svg',
    color: '#00A4EF',
    bgColor: '#FFFFFF',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get OAuth provider config */
export function getOAuthProvider(provider: OAuthProviderType): Partial<OAuthProvider> | undefined {
  return OAUTH_PROVIDERS[provider];
}

/** Check if provider is supported */
export function isProviderSupported(provider: string): provider is OAuthProviderType {
  return provider in OAUTH_PROVIDERS;
}

/** Generate OAuth state */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Generate PKCE code verifier */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/** Generate PKCE code challenge */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

/** Base64 URL encode */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Build OAuth authorization URL */
export function buildAuthorizationUrl(
  provider: OAuthProviderType,
  params: {
    clientId: string;
    redirectUri: string;
    state: string;
    scope?: string[];
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }
): string {
  const config = OAUTH_PROVIDERS[provider];
  if (!config?.authUrl) throw new Error(`Unknown provider: ${provider}`);
  
  const url = new URL(config.authUrl);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', config.responseType || 'code');
  url.searchParams.set('state', params.state);
  
  const scope = params.scope || config.scope || [];
  if (scope.length > 0) {
    url.searchParams.set('scope', scope.join(config.scopeDelimiter || ' '));
  }
  
  if (params.codeChallenge && config.pkce) {
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', params.codeChallengeMethod || 'S256');
  }
  
  return url.toString();
}

/** Parse OAuth callback URL */
export function parseCallbackUrl(url: string): OAuthCallback {
  const urlObj = new URL(url);
  return {
    code: urlObj.searchParams.get('code') || undefined,
    state: urlObj.searchParams.get('state') || undefined,
    error: urlObj.searchParams.get('error') || undefined,
    errorDescription: urlObj.searchParams.get('error_description') || undefined,
    provider: 'google', // Should be determined from state
  };
}

/** Check if tokens are expired */
export function areTokensExpired(tokens: OAuthTokens, bufferSeconds: number = 60): boolean {
  if (!tokens.expiresAt) return false;
  const expiresAt = new Date(tokens.expiresAt);
  const now = new Date();
  now.setSeconds(now.getSeconds() + bufferSeconds);
  return now >= expiresAt;
}

/** Normalize OAuth profile across providers */
export function normalizeProfile(provider: OAuthProviderType, data: Record<string, unknown>): OAuthProfile {
  switch (provider) {
    case 'google':
      return {
        id: String(data.sub || data.id),
        provider,
        email: data.email as string,
        emailVerified: data.email_verified as boolean,
        name: data.name as string,
        firstName: data.given_name as string,
        lastName: data.family_name as string,
        displayName: data.name as string,
        avatar: data.picture as string,
        locale: data.locale as string,
        raw: data,
      };
    case 'github':
      return {
        id: String(data.id),
        provider,
        email: data.email as string,
        name: data.name as string,
        displayName: data.name as string || data.login as string,
        username: data.login as string,
        avatar: data.avatar_url as string,
        profileUrl: data.html_url as string,
        raw: data,
      };
    case 'linkedin':
      return {
        id: String(data.sub || data.id),
        provider,
        email: data.email as string,
        emailVerified: data.email_verified as boolean,
        name: data.name as string,
        firstName: data.given_name as string,
        lastName: data.family_name as string,
        displayName: data.name as string,
        avatar: data.picture as string,
        locale: data.locale as string,
        raw: data,
      };
    default:
      return {
        id: String(data.id || data.sub),
        provider,
        email: data.email as string,
        name: data.name as string,
        displayName: data.name as string || data.username as string,
        username: data.username as string || data.login as string,
        avatar: data.avatar_url as string || data.picture as string,
        raw: data,
      };
  }
}

export default OAuthProvider;