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

  return { data, error, mutate }
}
