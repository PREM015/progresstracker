// src/types/platform.ts

export type PlatformCategoryId = 'dsa' | 'job' | 'hackathon' | 'git' | 'learning' | 'opensource' | 'company'

export interface PlatformCategory {
  id: PlatformCategoryId
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  order?: number
}

export type AuthType = 'scraping' | 'api' | 'manual' | 'oauth'

export interface Platform {
  id: string
  name: string
  slug: string
  category: PlatformCategoryId  // ✅ Changed from PlatformCategory to PlatformCategoryId
  displayName?: string
  icon?: string
  color?: string
  website?: string
  authType?: AuthType
  supportsAutoSync?: boolean
  description?: string
  dataPoints?: string[]
  setupInstructions?: string
}

export interface UserPlatform {
  id: string
  userId: string
  platformId: string
  username?: string
  token?: string
  createdAt: Date
  platform?: Platform
}

export interface PlatformConnection {
  platform: Platform
  isConnected: boolean
  username?: string
  lastSynced?: Date
  syncStatus?: 'success' | 'failed' | 'pending'
}

export default Platform