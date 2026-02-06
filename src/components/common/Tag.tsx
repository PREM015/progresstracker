interface TagProps {
    children: React.ReactNode;
    onRemove?: () => void;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export default function Tag({ children, onRemove, variant = 'default' }: TagProps) {
    const variants = {
        default: 'bg-gray-100 text-gray-700',
        primary: 'bg-indigo-100 text-indigo-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-orange-100 text-orange-700',
        danger: 'bg-red-100 text-red-700',
    };

    return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${variants[variant]}`}>
            {children}
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="hover:opacity-70"
                    aria-label="Remove tag"
                >
                    ×
                </button>
            )}
        </span>
    );
}
