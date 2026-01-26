"use client"

import useSWR from "swr"

import { PlatformCategory } from "@/types/platform"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function usePlatforms(
  category?: PlatformCategory,
  search?: string
) {

  const params = new URLSearchParams()
  if (category) params.append("category", String(category))
  if (search?.trim()) params.append("search", search.trim())

  const queryString = params.toString()
  const url = `/api/platforms${queryString ? `?${queryString}` : ""}`

  const { data, error, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  })

  const connectPlatform = async (platformId: string, username?: string, token?: string) => {
    const response = await fetch('/api/platforms/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformId, username, token })
    })
    if (!response.ok) throw new Error('Failed to connect platform')
    return response.json()
  }

  const disconnectPlatform = async (platformId: string) => {
    const response = await fetch('/api/platforms/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformId })
    })
    if (!response.ok) throw new Error('Failed to disconnect platform')
    return response.json()
  }

  return { 
    platforms: data || [], 
    error, 
    mutate,
    connectPlatform,
    disconnectPlatform
  }
}

export function useConnectedPlatforms() {
  const { data, error, mutate } = useSWR('/api/platforms/connected', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  })

  const connections = data?.connections || []
  const allPlatforms = data?.stats || {}
  
  const connectedCount = data?.stats?.connected || 0
  const totalCount = data?.stats?.total || 0
  const remainingCount = totalCount - connectedCount

  const stats = {
    total: totalCount,
    connected: connectedCount,
    remaining: remainingCount
  }

  return {
    connections,
    stats,
    isLoading: !data && !error,
    refresh: mutate
  }
}
