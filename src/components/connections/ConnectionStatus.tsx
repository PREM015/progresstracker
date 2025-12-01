import Badge from "@/components/ui/Badge"

interface ConnectionStatusProps {
  isConnected: boolean
  lastSynced?: Date
}

export default function ConnectionStatus({ isConnected, lastSynced }: ConnectionStatusProps) {
  if (!isConnected) {
    return <Badge variant="default">Not Connected</Badge>
  }

  return (
    <div className="flex flex-col gap-1">
      <Badge variant="success">Connected</Badge>
      {lastSynced && (
        <span className="text-xs text-gray-500">
          Last synced: {new Date(lastSynced).toLocaleDateString()}
        </span>
      )}
    </div>
  )
}