import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    label?: string;
    centered?: boolean;
}

const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
};

export function LoadingSpinner({
    size = 'md',
    label,
    centered = false,
    className,
    ...props
}: LoadingSpinnerProps) {
    const content = (
        <div className={cn('flex flex-col items-center justify-center gap-2', className)} {...props}>
            <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
            {label && <p className="text-sm text-muted-foreground font-medium">{label}</p>}
        </div>
    );

    if (centered) {
        return (
            <div className="flex h-full w-full min-h-[100px] items-center justify-center">
                {content}
            </div>
        );
    }

    return content;
}
