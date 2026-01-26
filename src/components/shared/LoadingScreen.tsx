"use client";

import React from "react";
import clsx from "clsx";

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function LoadingScreen({
  message = "Loading...",
  fullScreen = false,
  size = "md",
}: LoadingScreenProps) {
  const spinnerSize = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={clsx("relative", spinnerSize[size])}>
        <div className="absolute inset-0 bg-linear-to-r from-blue-500 to-purple-500 rounded-full animate-spin" />
        <div className={clsx("absolute inset-1 bg-white dark:bg-gray-900 rounded-full", spinnerSize[size])} />
      </div>
      {message && (
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-50">
        {content}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-12">{content}</div>;
}
