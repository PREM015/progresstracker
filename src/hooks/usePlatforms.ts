"use client"

import useSWR from "swr"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function usePlatforms(category?: string, search?: string) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Build query params - ✅ FIX: Filter out empty/null values
  const params = new URLSearchParams()
  if (category && category !== "all") params.append("category", category)
  if (search?.trim()) params.append("search", search.trim())

  const queryString = params.toString()
  const url = `/api/platforms${queryString ? `?${queryString}` : ""}`

  // ✅ FIX: Add config to prevent unnecessary re-fetching
  const { data, error, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000, // Prevent duplicate requests within 2 seconds
  })

  const platforms = data?.platforms || []
  const isLoading = !data && !error

  // Connect platform
  const connectPlatform = async (
    platformId: string,
    username?: string,
    token?: string
  ) => {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/platforms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformId, username, token }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to connect platform")
      }

      const result = await response.json()
      await mutate() // ✅ FIX: await the mutate
      return result
    } catch (error: any) {
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  // Disconnect platform
  const disconnectPlatform = async (platformId: string) => {
    setIsDisconnecting(true)
    try {
      const response = await fetch("/api/platforms/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to disconnect platform")
      }

      const result = await response.json()
      await mutate() // ✅ FIX: await the mutate
      return result
    } catch (error: any) {
      throw error
    } finally {
      setIsDisconnecting(false)
    }
  }

  return {
    platforms,
    isLoading,
    error,
    connectPlatform,
    disconnectPlatform,
    isConnecting,
    isDisconnecting,
    refresh: mutate,
  }
}

// Hook for connected platforms
export function useConnectedPlatforms() {
  const { data, error, mutate } = useSWR("/api/platforms/connected", fetcher, {
    revalidateOnFocus: false,
  })

  return {
    connections: data?.connections || [],
    stats: data?.stats || { total: 0, connected: 0, remaining: 0 },
    isLoading: !data && !error,
    error,
    refresh: mutate,
  }
}