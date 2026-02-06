interface StatusIndicatorProps {
    status: 'online' | 'offline' | 'away' | 'busy';
    showLabel?: boolean;
}

export default function StatusIndicator({ status, showLabel = false }: StatusIndicatorProps) {
    const config = {
        online: { color: 'bg-green-500', label: 'Online' },
        offline: { color: 'bg-gray-400', label: 'Offline' },
        away: { color: 'bg-yellow-500', label: 'Away' },
        busy: { color: 'bg-red-500', label: 'Busy' },
    };

    return (
        <div className="inline-flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${config[status].color}`} />
            {showLabel && <span className="text-sm text-gray-600">{config[status].label}</span>}
        </div>
    );
}
