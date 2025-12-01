"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs component");
  }
  return context;
}

interface TabsProps {
  defaultValue: string;
  children: ReactNode;
}

export function Tabs({ defaultValue, children }: TabsProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ value, onChange: setValue }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

function TabsList({ children, className }: TabsListProps) {
  return <div className={cn("flex gap-4", className)}>{children}</div>;
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
}

function TabsTrigger({ value, children }: TabsTriggerProps) {
  const { value: selectedValue, onChange } = useTabsContext();
  const isActive = selectedValue === value;

  return (
    <button
      onClick={() => onChange(value)}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors border-b-2",
        isActive
          ? "border-blue-600 text-blue-600 dark:text-blue-400"
          : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
}

function TabsContent({ value, children }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();

  if (selectedValue !== value) return null;

  return <div>{children}</div>;
}

// Attach sub-components
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;