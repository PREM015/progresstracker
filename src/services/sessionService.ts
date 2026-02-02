  // src/services/sessionService.ts
  // Complete session management service

  import { prisma } from '@/lib/prisma';
  import { nanoid } from 'nanoid';
  import { Prisma } from '@prisma/client';

  // =============================================================================
  // TYPES
  // =============================================================================

  export interface SessionInfo {
    id: string;
    userId: string;
    token: string;
    userAgent: string | null;
    ipAddress: string | null;
    device: string | null;
    deviceModel: string | null;
    browser: string | null;
    browserVersion: string | null;
    os: string | null;
    osVersion: string | null;
    country: string | null;
    countryCode: string | null;
    city: string | null;
    region: string | null;
    isValid: boolean;
    isCurrent: boolean;
    lastActiveAt: Date;
    expiresAt: Date;
    createdAt: Date;
  }

  export interface CreateSessionInput {
    userAgent?: string;
    ipAddress?: string;
    device?: string;
    deviceModel?: string;
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    country?: string;
    countryCode?: string;
    city?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  }

  export interface RefreshTokenInfo {
    id: string;
    userId: string;
    token: string;
    family: string;
    deviceId: string | null;
    isValid: boolean;
    expiresAt: Date;
    createdAt: Date;
  }

  // =============================================================================
  // SESSION SERVICE
  // =============================================================================

  export class SessionService {
    // Default session duration: 30 days
    private static readonly SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
    // Default refresh token duration: 7 days
    private static readonly REFRESH_TOKEN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

    // ===========================================================================
    // CREATE SESSION
    // ===========================================================================

    /**
     * Create a new active session
     */
    static async createSession(
      userId: string,
      data: CreateSessionInput
    ): Promise<SessionInfo> {
      const token = nanoid(64);
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION_MS);

      const session = await prisma.activeSession.create({
        data: {
          userId,
          token,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          device: data.device,
          deviceModel: data.deviceModel,
          browser: data.browser,
          browserVersion: data.browserVersion,
          os: data.os,
          osVersion: data.osVersion,
          country: data.country,
          countryCode: data.countryCode,
          city: data.city,
          region: data.region,
          latitude: data.latitude,
          longitude: data.longitude,
          isValid: true,
          isCurrent: true,
          lastActiveAt: new Date(),
          expiresAt,
        },
      });

      // Mark other sessions as not current
      await prisma.activeSession.updateMany({
        where: {
          userId,
          id: { not: session.id },
          isCurrent: true,
        },
        data: { isCurrent: false },
      });

      return this.formatSession(session);
    }

    // ===========================================================================
    // GET SESSIONS
    // ===========================================================================

    /**
     * Get all active sessions for a user
     */
    static async getUserSessions(userId: string): Promise<SessionInfo[]> {
      const sessions = await prisma.activeSession.findMany({
        where: {
          userId,
          isValid: true,
          expiresAt: { gt: new Date() },
        },
        orderBy: [
          { isCurrent: 'desc' },
          { lastActiveAt: 'desc' },
        ],
      });

      return sessions.map((s) => this.formatSession(s));
    }

    /**
     * Get session by token
     */
    static async getSessionByToken(token: string): Promise<SessionInfo | null> {
      const session = await prisma.activeSession.findUnique({
        where: { token },
      });

      if (!session || !session.isValid || session.expiresAt < new Date()) {
        return null;
      }

      return this.formatSession(session);
    }

    /**
     * Get session by ID
     */
    static async getSessionById(
      id: string,
      userId: string
    ): Promise<SessionInfo | null> {
      const session = await prisma.activeSession.findFirst({
        where: { id, userId },
      });

      return session ? this.formatSession(session) : null;
    }

    /**
     * Get current session
     */
    static async getCurrentSession(userId: string): Promise<SessionInfo | null> {
      const session = await prisma.activeSession.findFirst({
        where: {
          userId,
          isCurrent: true,
          isValid: true,
          expiresAt: { gt: new Date() },
        },
      });

      return session ? this.formatSession(session) : null;
    }

    // ===========================================================================
    // VALIDATE SESSION
    // ===========================================================================

    /**
     * Validate and refresh a session
     */
    static async validateSession(token: string): Promise<{
      valid: boolean;
      session: SessionInfo | null;
      userId: string | null;
    }> {
      const session = await prisma.activeSession.findUnique({
        where: { token },
      });

      if (!session) {
        return { valid: false, session: null, userId: null };
      }

      if (!session.isValid || session.expiresAt < new Date()) {
        return { valid: false, session: null, userId: session.userId };
      }

      // Update last active time
      await prisma.activeSession.update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() },
      });

      return {
        valid: true,
        session: this.formatSession(session),
        userId: session.userId,
      };
    }

    // ===========================================================================
    // UPDATE SESSION
    // ===========================================================================

    /**
     * Update session activity
     */
    static async updateSessionActivity(token: string): Promise<void> {
      await prisma.activeSession.update({
        where: { token },
        data: { lastActiveAt: new Date() },
      }).catch(() => {
        // Ignore errors (session may not exist)
      });
    }

    /**
     * Extend session expiration
     */
    static async extendSession(token: string): Promise<SessionInfo | null> {
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION_MS);

      try {
        const session = await prisma.activeSession.update({
          where: { token },
          data: {
            expiresAt,
            lastActiveAt: new Date(),
          },
        });

        return this.formatSession(session);
      } catch {
        return null;
      }
    }

    // ===========================================================================
    // REVOKE SESSIONS
    // ===========================================================================

    /**
     * Revoke a specific session
     */
    static async revokeSession(
      id: string,
      userId: string,
      reason?: string
    ): Promise<boolean> {
      const result = await prisma.activeSession.updateMany({
        where: { id, userId },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: reason || 'user_revoked',
        },
      });

      return result.count > 0;
    }

    /**
     * Revoke session by token
     */
    static async revokeSessionByToken(
      token: string,
      reason?: string
    ): Promise<boolean> {
      const result = await prisma.activeSession.updateMany({
        where: { token },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: reason || 'logout',
        },
      });

      return result.count > 0;
    }

    /**
     * Revoke all sessions for a user
     */
    static async revokeAllSessions(
      userId: string,
      reason?: string,
      exceptToken?: string
    ): Promise<{ count: number }> {
      const where: Prisma.ActiveSessionWhereInput = {
        userId,
        isValid: true,
      };

      if (exceptToken) {
        where.token = { not: exceptToken };
      }

      const result = await prisma.activeSession.updateMany({
        where,
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: reason || 'all_sessions_revoked',
        },
      });

      return { count: result.count };
    }

    /**
     * Revoke all other sessions (keep current)
     */
    static async revokeOtherSessions(
      userId: string,
      currentToken: string
    ): Promise<{ count: number }> {
      return this.revokeAllSessions(userId, 'other_sessions_revoked', currentToken);
    }

    // ===========================================================================
    // REFRESH TOKENS
    // ===========================================================================

    /**
     * Create a refresh token
     */
    static async createRefreshToken(
      userId: string,
      family?: string,
      deviceId?: string
    ): Promise<RefreshTokenInfo> {
      const token = nanoid(64);
      const tokenFamily = family || nanoid(32);
      const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_DURATION_MS);

      const refreshToken = await prisma.refreshToken.create({
        data: {
          userId,
          token,
          family: tokenFamily,
          deviceId,
          isValid: true,
          expiresAt,
        },
      });

      return this.formatRefreshToken(refreshToken);
    }

    /**
     * Validate refresh token
     */
    static async validateRefreshToken(token: string): Promise<{
      valid: boolean;
      refreshToken: RefreshTokenInfo | null;
      userId: string | null;
    }> {
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token },
      });

      if (!refreshToken) {
        return { valid: false, refreshToken: null, userId: null };
      }

      if (!refreshToken.isValid || refreshToken.expiresAt < new Date()) {
        // Token reuse detected - invalidate entire family
        if (refreshToken.revokedAt) {
          await this.revokeTokenFamily(refreshToken.family);
        }
        return { valid: false, refreshToken: null, userId: refreshToken.userId };
      }

      return {
        valid: true,
        refreshToken: this.formatRefreshToken(refreshToken),
        userId: refreshToken.userId,
      };
    }

    /**
     * Rotate refresh token
     */
    static async rotateRefreshToken(
      oldToken: string
    ): Promise<RefreshTokenInfo | null> {
      const validation = await this.validateRefreshToken(oldToken);

      if (!validation.valid || !validation.refreshToken) {
        return null;
      }

      // Invalidate old token
      await prisma.refreshToken.update({
        where: { token: oldToken },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'rotated',
        },
      });

      // Create new token in same family
      return this.createRefreshToken(
        validation.refreshToken.userId,
        validation.refreshToken.family,
        validation.refreshToken.deviceId || undefined
      );
    }

    /**
     * Revoke token family (for security - token reuse detection)
     */
    static async revokeTokenFamily(family: string): Promise<{ count: number }> {
      const result = await prisma.refreshToken.updateMany({
        where: { family },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'family_revoked',
        },
      });

      return { count: result.count };
    }

    /**
     * Revoke all refresh tokens for a user
     */
    static async revokeAllRefreshTokens(
      userId: string,
      reason?: string
    ): Promise<{ count: number }> {
      const result = await prisma.refreshToken.updateMany({
        where: { userId, isValid: true },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: reason || 'all_revoked',
        },
      });

      return { count: result.count };
    }

    // ===========================================================================
    // CLEANUP
    // ===========================================================================

    /**
     * Clean up expired sessions
     */
    static async cleanupExpiredSessions(): Promise<{ count: number }> {
      const result = await prisma.activeSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isValid: false, revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          ],
        },
      });

      return { count: result.count };
    }

    /**
     * Clean up expired refresh tokens
     */
    static async cleanupExpiredRefreshTokens(): Promise<{ count: number }> {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isValid: false, revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          ],
        },
      });

      return { count: result.count };
    }

    // ===========================================================================
    // HELPER METHODS
    // ===========================================================================

    /**
     * Format session for API response
     */
    private static formatSession(
      session: Prisma.ActiveSessionGetPayload<Record<string, never>>
    ): SessionInfo {
      return {
        id: session.id,
        userId: session.userId,
        token: session.token,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        device: session.device,
        deviceModel: session.deviceModel,
        browser: session.browser,
        browserVersion: session.browserVersion,
        os: session.os,
        osVersion: session.osVersion,
        country: session.country,
        countryCode: session.countryCode,
        city: session.city,
        region: session.region,
        isValid: session.isValid,
        isCurrent: session.isCurrent,
        lastActiveAt: session.lastActiveAt,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      };
    }

    /**
     * Format refresh token for API response
     */
    private static formatRefreshToken(
      token: Prisma.RefreshTokenGetPayload<Record<string, never>>
    ): RefreshTokenInfo {
      return {
        id: token.id,
        userId: token.userId,
        token: token.token,
        family: token.family,
        deviceId: token.deviceId,
        isValid: token.isValid,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      };
    }
  }

  export default SessionService;