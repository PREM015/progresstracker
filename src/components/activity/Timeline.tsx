interface TimelineProps {
    items: Array<{
        id: string;
        title: string;
        description: string;
        timestamp: string;
        type?: 'success' | 'warning' | 'error' | 'info';
    }>;
}

export default function Timeline({ items }: TimelineProps) {
    const getColor = (type?: string) => {
        const colors = {
            success: 'bg-green-500',
            warning: 'bg-orange-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
        };
        return colors[type as keyof typeof colors] || 'bg-gray-500';
    };

    return (
        <div className="space-y-4">
            {items.map((item, index) => (
                <div key={item.id} className="relative pl-8">
                    {index !== items.length - 1 && (
                        <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    <div className={`absolute left-0 top-2 w-4 h-4 rounded-full ${getColor(item.type)}`} />
                    <div>
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.timestamp}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
