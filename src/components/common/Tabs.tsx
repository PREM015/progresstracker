// ============================================================================
// FILE: src/components/common/Tabs.tsx
// PURPOSE: Generic tabs component with variants and optional persistence
// ============================================================================

'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/utils/useLocalStorage';

// VARIANT TYPES:
type TabsVariant = 'default' | 'pills' | 'underline' | 'boxed';

// CONTEXT FOR VARIANT:
const TabsContext = React.createContext<{ variant: TabsVariant }>({ variant: 'default' });

// ROOT COMPONENT:
interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
    variant?: TabsVariant;
    storageKey?: string; // If provided, persists active tab to localStorage
}

export function Tabs({
    variant = 'default',
    storageKey,
    defaultValue,
    onValueChange,
    className,
    ...props
}: TabsProps) {
    // Use localStorage hook if storageKey is provided
    // We need to handle the case where defaultValue is provided but storage might override it
    // or vice versa.

    // Note: We can't conditionally use the hook, so we always use it 
    // but ignore the result if storageKey is undefined.
    // Using a dummy key if undefined to prevent errors, but we won't use the value.
    const [storedValue, setStoredValue] = useLocalStorage<string>(
        storageKey || 'temp-tabs-key',
        defaultValue || ''
    );

    const isControlled = props.value !== undefined;

    // If storageKey is provided and not controlled, use stored value
    const effectiveValue = (storageKey && !isControlled) ? storedValue : props.value;
    const effectiveDefaultValue = (storageKey && !isControlled) ? undefined : defaultValue;

    const handleValueChange = (value: string) => {
        if (storageKey) {
            setStoredValue(value);
        }
        onValueChange?.(value);
    };

    return (
        <TabsContext.Provider value={{ variant }}>
            <TabsPrimitive.Root
                className={cn('w-full', className)}
                value={effectiveValue}
                defaultValue={effectiveDefaultValue}
                onValueChange={handleValueChange}
                {...props}
            />
        </TabsContext.Provider>
    );
}

// LIST COMPONENT:
const listVariants: Record<TabsVariant, string> = {
    default: 'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
    pills: 'inline-flex items-center gap-2',
    underline: 'inline-flex items-center gap-4 border-b',
    boxed: 'inline-flex items-center rounded-lg border p-1',
};

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
    const { variant } = React.useContext(TabsContext);
    return (
        <TabsPrimitive.List className={cn(listVariants[variant], className)} {...props} />
    );
}

// TRIGGER COMPONENT:
const triggerVariants: Record<TabsVariant, string> = {
    default: cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5',
        'text-sm font-medium ring-offset-background transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
    ),
    pills: cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2',
        'text-sm font-medium transition-colors',
        'hover:bg-muted',
        'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
    ),
    underline: cn(
        'inline-flex items-center justify-center whitespace-nowrap pb-2 px-1',
        'text-sm font-medium transition-colors border-b-2 border-transparent',
        'hover:text-foreground',
        'data-[state=active]:border-primary data-[state=active]:text-foreground'
    ),
    boxed: cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5',
        'text-sm font-medium transition-colors',
        'hover:bg-muted',
        'data-[state=active]:bg-background data-[state=active]:shadow-sm'
    ),
};

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
    const { variant } = React.useContext(TabsContext);
    return (
        <TabsPrimitive.Trigger className={cn(triggerVariants[variant], className)} {...props} />
    );
}

// CONTENT COMPONENT:
export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            className={cn(
                'mt-2 ring-offset-background',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                className
            )}
            {...props}
        />
    );
}
