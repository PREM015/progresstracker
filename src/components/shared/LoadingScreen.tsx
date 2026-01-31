"use client";

import React from "react";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 z-50">
      {/* Animated emoji */}
      <div className="animate-bounce mb-4 text-5xl">⏳</div>

      {/* Spinner */}
      <Spinner size={60} />

      {/* Message */}
      {message && (
        <p className="mt-4 text-gray-700 dark:text-gray-200 text-center text-lg font-medium">
          {message}
        </p>
      )}

      {/* Optional: subtle overlay shadow */}
      <div className="absolute inset-0 bg-black/10 dark:bg-black/20 pointer-events-none"></div>
    </div>
  );
};

// Inline Spinner component
const Spinner: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <div
    className="relative flex items-center justify-center"
    style={{ width: size, height: size }}
  >
    <div
      className="absolute border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"
      style={{ width: size, height: size }}
    />
    <div
      className="absolute border-4 border-gray-200 dark:border-gray-700 border-t-blue-300 dark:border-t-blue-600 rounded-full animate-spin"
      style={{
        width: size * 0.7,
        height: size * 0.7,
        animationDuration: "0.8s",
      }}
    />
  </div>
);

export default LoadingScreen;
