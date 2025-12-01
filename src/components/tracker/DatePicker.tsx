"use client";

export default function DatePicker() {
  return (
    <div className="flex gap-4">
      <input
        type="date"
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
      <span className="flex items-center text-gray-600 dark:text-gray-400">to</span>
      <input
        type="date"
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
    </div>
  );
}