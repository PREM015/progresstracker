"use client";

import React from "react";


interface EmptyStateProps {
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  message = "No data available",
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-20 bg-gray-50 dark:bg-gray-900 text-center">
      {/* Modern Icon */}
      <div className="mb-6 text-7xl animate-bounce">📭</div>

      {/* Message */}
      <p className="text-gray-700 dark:text-gray-300 text-lg font-medium mb-6 max-w-xs">
        {message}
      </p>

      {/* Action Button */}
      {actionLabel && onAction && (
        <button
          className="px-6 py-3 bg-linear-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
