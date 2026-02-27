'use client';

import React from 'react';

interface NotificationFiltersProps {
  filters: {
    type: string;
    read: boolean;
  };
  onChange: (filters: { type: string; read: boolean }) => void;
  className?: string;
}

export const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  filters,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex gap-3 ${className}`}>
      <select
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value })}
        className="px-4 py-2 border rounded-lg"
      >
        <option value="all">All Types</option>
        <option value="achievement">Achievements</option>
        <option value="goal">Goals</option>
        <option value="sync">Sync Updates</option>
        <option value="system">System</option>
      </select>

      <select
        value={filters.read ? 'read' : 'unread'}
        onChange={(e) => onChange({ ...filters, read: e.target.value === 'read' })}
        className="px-4 py-2 border rounded-lg"
      >
        <option value="all">All</option>
        <option value="unread">Unread</option>
        <option value="read">Read</option>
      </select>
    </div>
  );
};

export default NotificationFilters;
