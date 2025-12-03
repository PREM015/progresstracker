"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs components must be used inside <Tabs />");
  }
  return ctx;
}

/* -------------------------------- Tabs -------------------------------- */

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue
  );

  const value = controlledValue ?? uncontrolledValue;

  const setValue = (val: string) => {
    if (controlledValue === undefined) {
      setUncontrolledValue(val);
    }
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ value: value!, setValue }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/* ----------------------------- TabsList ----------------------------- */

export interface TabsListProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        "flex gap-2 border-b border-gray-200 dark:border-gray-700",
        className
      )}
      {...props}
    />
  );
}

/* --------------------------- TabsTrigger --------------------------- */

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const { value: activeValue, setValue } = useTabs();
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      onClick={() => setValue(value)}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-all",
        "border-b-2 -mb-px",
        isActive
          ? "border-blue-600 text-blue-600 dark:text-blue-400"
          : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* --------------------------- TabsContent --------------------------- */

export interface TabsContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: TabsContentProps) {
  const { value: activeValue } = useTabs();

  if (activeValue !== value) return null;

  return (
    <div className={cn("pt-4", className)} {...props}>
      {children}
    </div>
  );
}

/* ----------------------- shadcn-style aliases ----------------------- */

Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

/* -----------------------------------------------------------------------------
 Default export (backward compatibility ✅)
----------------------------------------------------------------------------- */

export default Tabs;
