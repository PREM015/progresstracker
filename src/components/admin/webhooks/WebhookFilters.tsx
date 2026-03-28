// src/components/admin/webhooks/WebhookFilters.tsx
'use client';

import React from 'react';

interface FiltersState {
  isActive?: string;
  search?: string;
}

interface Props {
  value: FiltersState;
  onChange: (f: FiltersState) => void;
}

export function WebhookFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <input
        type="search"
        value={value.search || ''}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        placeholder="Search URL or description…"
        className="flex-1 min-w-40 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={value.isActive ?? ''}
        onChange={(e) => onChange({ ...value, isActive: e.target.value || undefined })}
        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Status</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
    </div>
  );
}

export default WebhookFilters;
