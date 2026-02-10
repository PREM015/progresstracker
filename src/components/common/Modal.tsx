// ============================================================================
// FILE: src/components/common/Modal.tsx
// PURPOSE: Generic modal wrapper with consistent styling and behavior
// ============================================================================

'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// PROPS:
interface ModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showClose?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
}

// SIZE MAPPINGS:
const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[90vw]',
};

// COMPONENT:
export function Modal({
    open,
    onOpenChange,
    title,
    description,
    children,
    size = 'md',
    showClose = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
}: ModalProps) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                {/* Overlay */}
                <DialogPrimitive.Overlay
                    className={cn(
                        'fixed inset-0 z-50 bg-black/80',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
                    )}
                    onClick={closeOnOverlayClick ? undefined : (e) => e.stopPropagation()}
                />

                {/* Content */}
                <DialogPrimitive.Content
                    className={cn(
                        'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%]',
                        'gap-4 border bg-background p-6 shadow-lg duration-200',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
                        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
                        'sm:rounded-lg',
                        sizes[size]
                    )}
                    onEscapeKeyDown={closeOnEscape ? undefined : (e) => e.preventDefault()}
                >
                    {/* Header */}
                    {(title || description) && (
                        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                            {title && (
                                <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                                    {title}
                                </DialogPrimitive.Title>
                            )}
                            {description && (
                                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                                    {description}
                                </DialogPrimitive.Description>
                            )}
                        </div>
                    )}

                    {/* Body */}
                    {children}

                    {/* Close button */}
                    {showClose && (
                        <DialogPrimitive.Close
                            className={cn(
                                'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background',
                                'transition-opacity hover:opacity-100',
                                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                                'disabled:pointer-events-none',
                                'data-[state=open]:bg-accent data-[state=open]:text-muted-foreground'
                            )}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </DialogPrimitive.Close>
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

// MODAL FOOTER (for action buttons):
export function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
            {...props}
        />
    );
}

// CONTROLLED MODAL HOOK:
export function useModal(initialOpen = false) {
    const [open, setOpen] = React.useState(initialOpen);

    return {
        open,
        onOpenChange: setOpen,
        onOpen: () => setOpen(true),
        onClose: () => setOpen(false),
        toggle: () => setOpen((prev) => !prev),
    };
}
