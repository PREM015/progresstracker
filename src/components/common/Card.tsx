// ============================================================================
// FILE: src/components/common/Card.tsx
// PURPOSE: Enhanced card component with variants and interactive states
// ============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

// CARD VARIANTS:
const cardVariants = cva(
    'rounded-lg border bg-card text-card-foreground',
    {
        variants: {
            variant: {
                default: 'shadow-sm',
                outline: 'border-2',
                ghost: 'border-transparent shadow-none',
                elevated: 'shadow-lg',
                interactive: 'shadow-sm hover:shadow-md transition-shadow cursor-pointer',
            },
            padding: {
                none: 'p-0',
                sm: 'p-3',
                md: 'p-4',
                lg: 'p-6',
            },
        },
        defaultVariants: {
            variant: 'default',
            padding: 'md',
        },
    }
);

// PROPS:
interface CardProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
    as?: 'div' | 'article' | 'section';
}

// COMPONENT:
export function Card({
    className,
    variant,
    padding,
    as: Component = 'div',
    ...props
}: CardProps) {
    return (
        <Component
            className={cn(cardVariants({ variant, padding }), className)}
            {...props}
        />
    );
}

// SUB-COMPONENTS:
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex flex-col space-y-1.5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex items-center pt-4', className)} {...props} />;
}
