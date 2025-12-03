"use client";

import * as React from "react";
import clsx from "clsx";

type Direction = "left" | "right";

interface DropdownContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdown() {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("Dropdown must be used inside <Dropdown />");
  return ctx;
}

/* ------------------------------ Root ------------------------------ */

export interface DropdownProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Dropdown({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
}: DropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (v: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(v);
    onOpenChange?.(v);
  };

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className={clsx("relative inline-block", className)}>{children}</div>
    </DropdownContext.Provider>
  );
}

/* ----------------------------- Trigger ----------------------------- */

export interface DropdownTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

export const DropdownTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownTriggerProps
>(({ className, children, icon, ...props }, ref) => {
  const { open, setOpen } = useDropdown();
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={clsx(
        "px-3 py-2 rounded-md text-sm flex items-center gap-2",
        "bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});
DropdownTrigger.displayName = "DropdownTrigger";

/* ------------------------------ Content ------------------------------ */

export interface DropdownContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: Direction;
  closeOnSelect?: boolean;
}

export const DropdownContent: React.FC<DropdownContentProps> = ({
  className,
  align = "left",
  closeOnSelect = true,
  children,
  ...props
}) => {
  const { open, setOpen } = useDropdown();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className={clsx(
        "absolute z-50 mt-2 min-w-[8rem] bg-white border border-gray-200 rounded-md shadow-lg",
        align === "right" ? "right-0" : "left-0",
        className
      )}
      onClick={() => closeOnSelect && setOpen(false)}
      {...props}
    >
      {children}
    </div>
  );
};

/* ------------------------------- Item ------------------------------- */

export interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
  icon?: React.ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  className,
  disabled,
  icon,
  children,
  ...props
}) => (
  <div
    role="menuitem"
    tabIndex={disabled ? -1 : 0}
    className={clsx(
      "px-3 py-2 text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-100",
      disabled && "opacity-50 pointer-events-none",
      className
    )}
    {...props}
  >
    {icon}
    {children}
  </div>
);

/* ------------------------- Extra Items for flexibility ------------------------- */

export const DropdownCheckboxItem: React.FC<DropdownItemProps & { checked?: boolean }> = ({
  checked,
  children,
  ...props
}) => (
  <DropdownItem {...props}>
    <input type="checkbox" checked={checked} readOnly className="mr-2" />
    {children}
  </DropdownItem>
);

export const DropdownRadioItem: React.FC<DropdownItemProps & { checked?: boolean }> = ({
  checked,
  children,
  ...props
}) => (
  <DropdownItem {...props}>
    <input type="radio" checked={checked} readOnly className="mr-2" />
    {children}
  </DropdownItem>
);

export const DropdownLabel: React.FC<DropdownItemProps> = ({ children, ...props }) => (
  <div className="px-3 py-1 text-xs font-semibold text-gray-500" {...props}>
    {children}
  </div>
);

export const DropdownSeparator: React.FC<DropdownItemProps> = (props) => (
  <div className="border-t border-gray-200 my-1" {...props} />
);

/* -------------------------- Aliases / Named Exports -------------------------- */

Dropdown.Trigger = DropdownTrigger;
Dropdown.Content = DropdownContent;
Dropdown.Item = DropdownItem;
Dropdown.CheckboxItem = DropdownCheckboxItem;
Dropdown.RadioItem = DropdownRadioItem;
Dropdown.Label = DropdownLabel;
Dropdown.Separator = DropdownSeparator;

// Named exports for compatibility with old imports
export {
  Dropdown as DropdownMenu,
  DropdownTrigger as DropdownMenuTrigger,
  DropdownContent as DropdownMenuContent,
  DropdownItem as DropdownMenuItem,
  DropdownCheckboxItem as DropdownMenuCheckboxItem,
  DropdownRadioItem as DropdownMenuRadioItem,
  DropdownLabel as DropdownMenuLabel,
  DropdownSeparator as DropdownMenuSeparator,
};

// Default export
export default Dropdown;
