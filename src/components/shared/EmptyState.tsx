"use client";

import React, { ReactNode } from "react";
import clsx from "clsx";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-4 py-12 px-6",
        "rounded-lg border border-dashed border-gray-300 dark:border-gray-600",
        "bg-gray-50 dark:bg-gray-900/50",
        className
      )}
    >
      {icon && (
        <div className="text-gray-400 dark:text-gray-500">
          {icon}
        </div>
      )}
      <div className="text-center">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
