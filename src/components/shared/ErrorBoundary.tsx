"use client";

import React from "react";
import { prisma } from "@/lib/prisma";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<object>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo);
    // Log error to database
    prisma.auditLog.create({
      data: {
        action: "UPDATE",
        description: `${error.message} | ${JSON.stringify(errorInfo)}`,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-gray-900 text-center p-6">
          {/* Inline SVG Error Icon */}
          <svg
            className="w-16 h-16 mb-4 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728"
            />
          </svg>

          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Something went wrong
          </h1>

          <p className="text-gray-700 dark:text-gray-300 max-w-md">
            {this.state.error?.message || "Unknown error occurred."}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
