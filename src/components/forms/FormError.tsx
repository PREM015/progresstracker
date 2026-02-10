// ============================================================================
// FILE: src/components/forms/FormError.tsx
// PURPOSE: Form error message display component
// ============================================================================

import { AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// PROPS:
interface FormErrorProps {
    message?: string;
    errors?: string[];
    className?: string;
    variant?: 'inline' | 'block' | 'toast';
    onDismiss?: () => void;
}

// COMPONENT:
export function FormError({ message, errors, className, variant = 'inline', onDismiss }: FormErrorProps) {
    if (!message && (!errors || errors.length === 0)) {
        return null;
    }

    // Single message
    if (variant === 'inline' && message) {
        return (
            <p className={cn('text-sm font-medium text-destructive flex items-center gap-1', className)}>
                <AlertCircle className="h-4 w-4" />
                {message}
            </p>
        );
    }

    // Block variant with multiple errors
    if (variant === 'block') {
        const allErrors = errors || (message ? [message] : []);

        return (
            <div
                className={cn(
                    'rounded-md border border-destructive/50 bg-destructive/10 p-3',
                    className
                )}
                role="alert"
            >
                <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="flex-1">
                        <h5 className="text-sm font-medium text-destructive">
                            {allErrors.length === 1 ? 'Error' : 'Errors'}
                        </h5>
                        {allErrors.length === 1 ? (
                            <p className="text-sm text-destructive/80 mt-1">{allErrors[0]}</p>
                        ) : (
                            <ul className="text-sm text-destructive/80 mt-1 list-disc list-inside space-y-1">
                                {allErrors.map((error, i) => (
                                    <li key={i}>{error}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {onDismiss && (
                        <button onClick={onDismiss} className="text-destructive hover:text-destructive/80">
                            <XCircle className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Toast-style (for form-level errors)
    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground',
                className
            )}
            role="alert"
        >
            <AlertCircle className="h-4 w-4" />
            <span>{message}</span>
            {onDismiss && (
                <button onClick={onDismiss} className="ml-auto hover:opacity-80">
                    <XCircle className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

// FIELD ERROR (for use with react-hook-form):
interface FieldErrorProps {
    error?: { message?: string };
    className?: string;
}

export function FieldError({ error, className }: FieldErrorProps) {
    if (!error?.message) return null;

    return (
        <p className={cn('text-sm text-destructive mt-1', className)}>
            {error.message}
        </p>
    );
}
