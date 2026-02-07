import { CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

// PROPS:
interface FormSuccessProps {
    message?: string;
    className?: string;
    variant?: 'inline' | 'block' | 'toast';
    onDismiss?: () => void;
    autoHide?: number; // ms to auto-hide
}

// COMPONENT:
export function FormSuccess({
    message,
    className,
    variant = 'inline',
    onDismiss,
    autoHide
}: FormSuccessProps) {
    // Auto-hide effect
    React.useEffect(() => {
        if (autoHide && message && onDismiss) {
            const timer = setTimeout(onDismiss, autoHide);
            return () => clearTimeout(timer);
        }
    }, [autoHide, message, onDismiss]);

    if (!message) return null;

    if (variant === 'inline') {
        return (
            <p className={cn('text-sm font-medium text-green-600 flex items-center gap-1', className)}>
                <CheckCircle className="h-4 w-4" />
                {message}
            </p>
        );
    }

    if (variant === 'block') {
        return (
            <div
                className={cn(
                    'rounded-md border border-green-200 bg-green-50 p-3',
                    'dark:border-green-800 dark:bg-green-950',
                    className
                )}
                role="status"
            >
                <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">{message}</p>
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="ml-auto text-green-600 hover:text-green-700 dark:text-green-400"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Toast variant
    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm text-white',
                className
            )}
            role="status"
        >
            <CheckCircle className="h-4 w-4" />
            <span>{message}</span>
            {onDismiss && (
                <button onClick={onDismiss} className="ml-auto hover:opacity-80">
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
