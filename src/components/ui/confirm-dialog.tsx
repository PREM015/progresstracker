// src/components/ui/confirm-dialog.tsx
// Confirmation dialog component

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type ConfirmDialogVariant = 'default' | 'destructive' | 'warning';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
  /** Optional rich body content instead of description */
  children?: React.ReactNode;
}

const variantConfig: Record<ConfirmDialogVariant, { icon: string; confirmClass: string }> = {
  default: {
    icon: '?',
    confirmClass: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  },
  destructive: {
    icon: '🗑️',
    confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: '⚠️',
    confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  const { icon, confirmClass } = variantConfig[variant];

  const handleConfirm = useCallback(async () => {
    await onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? 'confirm-dialog-desc' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 mx-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className="text-2xl shrink-0 mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <p id="confirm-dialog-desc" className="mt-1.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
            {children && <div className="mt-2">{children}</div>}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-sm font-medium border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
              confirmClass
            )}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook to manage confirm dialog state */
export function useConfirmDialog() {
  const [dialog, setDialog] = React.useState<{
    open: boolean;
    resolve?: (confirmed: boolean) => void;
    props?: Partial<ConfirmDialogProps>;
  }>({ open: false });

  const confirm = useCallback(
    (props?: Partial<ConfirmDialogProps>): Promise<boolean> =>
      new Promise((resolve) => {
        setDialog({ open: true, resolve, props });
      }),
    []
  );

  const handleClose = useCallback(() => {
    dialog.resolve?.(false);
    setDialog({ open: false });
  }, [dialog]);

  const handleConfirm = useCallback(() => {
    dialog.resolve?.(true);
    setDialog({ open: false });
  }, [dialog]);

  const ConfirmDialogElement = (
    <ConfirmDialog
      open={dialog.open}
      onClose={handleClose}
      onConfirm={handleConfirm}
      {...dialog.props}
    />
  );

  return { confirm, ConfirmDialogElement };
}
