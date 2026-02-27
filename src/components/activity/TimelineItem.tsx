interface TimelineItemProps {
    title: string;
    description: string;
    timestamp: string;
    type?: 'success' | 'warning' | 'error' | 'info';
    isLast?: boolean;
}

export default function TimelineItem({ title, description, timestamp, type = 'info', isLast = false }: TimelineItemProps) {
    const colors = {
        success: 'bg-green-500',
        warning: 'bg-orange-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    };

    return (
        <div className="relative pl-8">
            {!isLast && <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gray-200" />}
            <div className={`absolute left-0 top-2 w-4 h-4 rounded-full ${colors[type]}`} />
            <div>
                <h3 className="font-medium text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600 mt-1">{description}</p>
                <p className="text-xs text-gray-400 mt-1">{timestamp}</p>
            </div>
        </div>
    );
}
