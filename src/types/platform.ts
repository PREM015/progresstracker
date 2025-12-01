export interface PlatformCategory {
	id: string
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
	category: PlatformCategory
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

export default Platform
