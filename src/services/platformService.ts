import { prisma } from "@/lib/prisma"
import { PlatformCategoryId } from "@/types/platform"

export class PlatformService {
  /**
   * Get all platforms
   */
  static async getAllPlatforms() {
    return await prisma.platform.findMany({
      orderBy: { name: "asc" },
    })
  }

  /**
   * Get platforms by category
   */
  static async getPlatformsByCategory(category: PlatformCategoryId) {
    // Map category to enum value
    const categoryMap: Record<PlatformCategoryId, string> = {
      dsa: 'DSA',
      job: 'JOB',
      git: 'GIT',
      learning: 'LEARNING',
      hackathon: 'HACKATHON',
      opensource: 'OPENSOURCE',
      company: 'COMPANY',
    }
    
    const enumCategory = categoryMap[category]
    if (!enumCategory) {
      throw new Error(`Invalid category: ${category}`)
    }
    
    return await prisma.platform.findMany({
      where: { category: enumCategory as any },
      orderBy: { name: "asc" },
    })
  }

  /**
   * Get single platform by ID
   */
  static async getPlatformById(id: string) {
    return await prisma.platform.findUnique({
      where: { id },
    })
  }

  /**
   * Search platforms by name
   */
  static async searchPlatforms(query: string) {
    return await prisma.platform.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      orderBy: { name: "asc" },
    })
  }

  /**
   * Get user's connected platforms
   */
  static async getUserConnectedPlatforms(userId: string) {
    return await prisma.userPlatform.findMany({
      where: { userId },
      include: {
        platform: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  /**
   * Connect platform to user
   */
  static async connectPlatform(
    userId: string,
    platformId: string,
    username?: string,
    token?: string
  ) {
    // Check if already connected
    const existing = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
    })

    if (existing) {
      throw new Error("Platform already connected")
    }

    return await prisma.userPlatform.create({
      data: {
        userId,
        platformId,
        username,
        credentials: token ? JSON.stringify({
          access_token: token,
          refresh_token: '',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }) : undefined,
      },
      include: {
        platform: true,
      },
    })
  }

  /**
   * Disconnect platform from user
   */
  static async disconnectPlatform(userId: string, platformId: string) {
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
    })

    if (!connection) {
      throw new Error("Platform not connected")
    }

    return await prisma.userPlatform.delete({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
    })
  }

  /**
   * Update platform connection
   */
  static async updatePlatformConnection(
    userId: string,
    platformId: string,
    data: { username?: string; token?: string }
  ) {
    return await prisma.userPlatform.update({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      data,
    })
  }

  /**
   * Check if platform is connected
   */
  static async isPlatformConnected(userId: string, platformId: string) {
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
    })

    return !!connection
  }

  /**
   * Get connection stats
   */
  static async getConnectionStats(userId: string) {
    const total = await prisma.platform.count()
    const connected = await prisma.userPlatform.count({
      where: { userId },
    })

    return {
      total,
      connected,
      remaining: total - connected,
    }
  }
}