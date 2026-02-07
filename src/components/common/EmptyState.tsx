import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
    variant?: 'default' | 'small' | 'error';
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    variant = 'default',
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center p-8 rounded-lg border border-dashed',
                variant === 'small' ? 'p-4 min-h-[100px]' : 'min-h-[300px]',
                variant === 'error' ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/10',
                className
            )}
        >
            <div className={cn(
                'flex items-center justify-center rounded-full bg-muted',
                variant === 'small' ? 'h-10 w-10 mb-3' : 'h-16 w-16 mb-4',
                variant === 'error' && 'bg-destructive/10'
            )}>
                {Icon && (
                    <Icon
                        className={cn(
                            variant === 'small' ? 'h-5 w-5' : 'h-8 w-8',
                            variant === 'error' ? 'text-destructive' : 'text-muted-foreground'
                        )}
                    />
                )}
            </div>

            <h3 className={cn(
                'font-semibold tracking-tight',
                variant === 'small' ? 'text-sm' : 'text-lg',
                variant === 'error' && 'text-destructive'
            )}>
                {title}
            </h3>

            <p className={cn(
                'text-muted-foreground mt-1 max-w-sm',
                variant === 'small' ? 'text-xs' : 'text-sm'
            )}>
                {description}
            </p>

            {action && (
                <div className={cn('mt-6', variant === 'small' && 'mt-3')}>
                    {action}
                </div>
            )}
        </div>
    );
}
