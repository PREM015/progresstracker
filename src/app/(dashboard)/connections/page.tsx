"use client"

import { useState, useCallback } from "react"
import { usePlatforms, useConnectedPlatforms } from "@/hooks/usePlatforms"
import { PlatformCategory } from "@/types/platform"

import PlatformGrid from "@/components/connections/PlatformGrid"
import CategoryFilter from "@/components/connections/CategoryFilter"
import SearchBar from "@/components/connections/SearchBar"
import AddCustomPlatform from "@/components/connections/AddCustomPlatform"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import Spinner from "@/components/ui/Spinner"

export default function ConnectionsPage() {
  const [selectedCategory, setSelectedCategory] =
    useState<PlatformCategory | null>(null)


  const [searchQuery, setSearchQuery] = useState("")
  const [showAddCustom, setShowAddCustom] = useState(false)

  const {
    platforms,
    isLoading: platformsLoading,
    connectPlatform,
    disconnectPlatform,
  } = usePlatforms(selectedCategory || undefined, searchQuery)

  const {
    connections,
    stats,
    isLoading: connectionsLoading,
    refresh: refreshConnections,
  } = useConnectedPlatforms()

  const connectedPlatformIds = connections.map((c: any) => c.platformId)

  const handleConnect = async (
    platformId: string,
    username?: string,
    token?: string
  ) => {
    try {
      await connectPlatform(platformId, username, token)
      await refreshConnections()
    } catch (error: any) {
      alert(error.message || "Failed to connect platform")
    }
  }

  const handleDisconnect = async (platformId: string) => {
    try {
      await disconnectPlatform(platformId)
      await refreshConnections()
    } catch (error: any) {
      alert(error.message || "Failed to disconnect platform")
    }
  }

  const handleAddCustomPlatform = async (platform: any) => {
    console.log("Add custom platform:", platform)
    alert("Custom platform feature coming soon!")
  }

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

const handleCategorySelect = useCallback(
  (category: PlatformCategory | null) => {
    setSelectedCategory(category)
  },
  []
)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Platform Connections
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Connect and manage your coding platforms
          </p>
        </div>
        <Button onClick={() => setShowAddCustom(true)}>
          + Add Custom Platform
        </Button>
      </div>

      {/* Stats Cards */}
      {!connectionsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Platforms
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🌐</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connected
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.connected}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Remaining
                </p>
                <p className="text-3xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                  {stats.remaining}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Search */}
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search platforms..."
          />

          {/* Category Filter */}
          <CategoryFilter
            selected={selectedCategory}
            onSelect={handleCategorySelect}
          />
        </div>
      </Card>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {platformsLoading ? (
            "Loading platforms..."
          ) : (
            <>
              Showing <strong>{platforms.length}</strong> platform{platforms.length !== 1 && "s"}
              {selectedCategory && <> in <strong>{selectedCategory.toUpperCase()}</strong></>}
              {searchQuery && <> matching <strong>"{searchQuery}"</strong></>}
            </>
          )}
        </p>
      </div>

      {/* Platform Grid */}
      {platformsLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <PlatformGrid
          platforms={platforms}
          connectedPlatforms={connectedPlatformIds}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      )}

      {/* Add Custom Platform Modal */}
      <AddCustomPlatform
        isOpen={showAddCustom}
        onClose={() => setShowAddCustom(false)}
        onAdd={handleAddCustomPlatform}
      />
    </div>
  )
}