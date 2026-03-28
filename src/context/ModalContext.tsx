// src/context/ModalContext.tsx
// Global modal management context

'use client';

import React, { createContext, useContext, useState, useCallback, useId } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ModalConfig {
  id?: string;
  title?: string;
  content: React.ReactNode;
  size?: ModalSize;
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  onClose?: () => void;
}

interface OpenModal extends ModalConfig {
  id: string;
}

interface ModalContextValue {
  modals: OpenModal[];
  openModal: (config: ModalConfig) => string;
  closeModal: (id: string) => void;
  closeAll: () => void;
  isOpen: (id: string) => boolean;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ModalContext = createContext<ModalContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState<OpenModal[]>([]);
  const idCounter = React.useRef(0);

  const openModal = useCallback((config: ModalConfig): string => {
    const id = config.id ?? `modal-${++idCounter.current}`;
    setModals((prev) => [...prev, { ...config, id, showClose: config.showClose ?? true, closeOnBackdrop: config.closeOnBackdrop ?? true }]);
    return id;
  }, []);

  const closeModal = useCallback((id: string) => {
    setModals((prev) => {
      const modal = prev.find((m) => m.id === id);
      modal?.onClose?.();
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const closeAll = useCallback(() => {
    setModals((prev) => {
      prev.forEach((m) => m.onClose?.());
      return [];
    });
  }, []);

  const isOpen = useCallback(
    (id: string): boolean => modals.some((m) => m.id === id),
    [modals]
  );

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal, closeAll, isOpen }}>
      {children}
      {/* Render portaled modals */}
      {modals.map((modal) => (
        <div
          key={modal.id}
          role="dialog"
          aria-modal="true"
          aria-label={modal.title}
          className="modal-overlay"
          onClick={modal.closeOnBackdrop ? () => closeModal(modal.id) : undefined}
        >
          <div
            className={`modal-container modal-${modal.size ?? 'md'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {modal.showClose && (
              <button
                aria-label="Close"
                className="modal-close-btn"
                onClick={() => closeModal(modal.id)}
              >
                ✕
              </button>
            )}
            {modal.title && <h2 className="modal-title">{modal.title}</h2>}
            <div className="modal-body">{modal.content}</div>
          </div>
        </div>
      ))}
    </ModalContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within a ModalProvider');
  return ctx;
}

/** Convenience hook to open a single managed modal */
export function useManagedModal(config: Omit<ModalConfig, 'id'>) {
  const { openModal, closeModal, isOpen } = useModal();
  const id = React.useRef(`managed-${Math.random().toString(36).slice(2)}`);

  const open = useCallback(() => {
    openModal({ ...config, id: id.current });
  }, [config, openModal]);

  const close = useCallback(() => {
    closeModal(id.current);
  }, [closeModal]);

  return { open, close, isOpen: isOpen(id.current) };
}
