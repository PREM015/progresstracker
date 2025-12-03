"use client";

import * as React from "react";
import clsx from "clsx";

interface DialogContextValue {
  open: boolean;
  setOpen: (o: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(
  null
);

function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error("Dialog components must be used inside <Dialog />");
  }
  return ctx;
}

/* ------------------------------- Root ------------------------------- */

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] =
    React.useState(defaultOpen);

  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (v: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(v);
    }
    onOpenChange?.(v);
  };

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

/* ----------------------------- Trigger ----------------------------- */

export function DialogTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setOpen } = useDialog();
  return (
    <div onClick={() => setOpen(true)} className="inline-block">
      {children}
    </div>
  );
}

/* ----------------------------- Content ----------------------------- */

export interface DialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogContent({
  className,
  children,
  ...props
}: DialogContentProps) {
  const { open, setOpen } = useDialog();

  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        className={clsx(
          "relative z-50 w-full max-w-lg bg-white rounded-lg shadow-lg p-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------- Header ------------------------------- */

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("mb-4 space-y-1", className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={clsx("text-lg font-semibold", className)}
      {...props}
    />
  );
}

/* ------------------------------- Footer ------------------------------- */

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("mt-6 flex justify-end gap-2", className)}
      {...props}
    />
  );
}

/* ------------------------------ Close ------------------------------ */

export function DialogClose({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setOpen } = useDialog();
  return <div onClick={() => setOpen(false)}>{children}</div>;
}

/* ------------------------- Aliases ------------------------- */

Dialog.Trigger = DialogTrigger;
Dialog.Content = DialogContent;
Dialog.Header = DialogHeader;
Dialog.Title = DialogTitle;
Dialog.Footer = DialogFooter;
Dialog.Close = DialogClose;

export default Dialog;
