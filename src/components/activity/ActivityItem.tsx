interface ActivityItemProps {
    icon: string;
    title: string;
    description: string;
    timestamp: string;
}

export default function ActivityItem({ icon, title, description, timestamp }: ActivityItemProps) {
    return (
        <div className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg">
            <div className="text-2xl">{icon}</div>
            <div className="flex-1">
                <h3 className="font-medium text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600 mt-1">{description}</p>
                <p className="text-xs text-gray-400 mt-2">{timestamp}</p>
            </div>
        </div>
    );
}
