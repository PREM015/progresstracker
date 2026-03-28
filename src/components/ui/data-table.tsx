// src/components/ui/data-table.tsx
// Generic data table component with sorting, pagination, and selection

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

interface DataTableProps<T extends { id: string | number }> {
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: Set<string | number>;
  onSelectedChange?: (ids: Set<string | number>) => void;
  onRowClick?: (row: T) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sortState?: SortState;
  onSortChange?: (sort: SortState) => void;
  className?: string;
  rowClassName?: (row: T) => string;
  caption?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function SortIndicator({ column, sort }: { column: string; sort?: SortState }) {
  if (!sort || sort.key !== column) return <span className="text-muted-foreground/40 ml-1">↕</span>;
  return <span className="text-primary ml-1">{sort.direction === 'asc' ? '↑' : '↓'}</span>;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  isLoading,
  emptyMessage = 'No results',
  selectable,
  selectedIds = new Set(),
  onSelectedChange,
  onRowClick,
  pagination,
  sortState,
  onSortChange,
  className,
  rowClassName,
  caption,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((r) => selectedIds.has(r.id));
  const someSelected = data.some((r) => selectedIds.has(r.id));

  const toggleAll = useCallback(() => {
    if (!onSelectedChange) return;
    if (allSelected) {
      const next = new Set(selectedIds);
      data.forEach((r) => next.delete(r.id));
      onSelectedChange(next);
    } else {
      const next = new Set(selectedIds);
      data.forEach((r) => next.add(r.id));
      onSelectedChange(next);
    }
  }, [allSelected, data, selectedIds, onSelectedChange]);

  const toggleRow = useCallback((id: string | number) => {
    if (!onSelectedChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }, [selectedIds, onSelectedChange]);

  const handleSort = (key: string) => {
    if (!onSortChange) return;
    if (sortState?.key === key) {
      onSortChange({ key, direction: sortState.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ key, direction: 'asc' });
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-muted/50">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-3 font-semibold text-left text-muted-foreground',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.sortable && 'cursor-pointer select-none hover:text-foreground',
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                >
                  {col.header}
                  {col.sortable && <SortIndicator column={String(col.key)} sort={sortState} />}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  {selectable && <td className="px-4 py-3"><div className="h-4 w-4 rounded bg-muted animate-pulse" /></td>}
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <div className={cn('h-4 rounded bg-muted animate-pulse', ['w-24','w-32','w-20','w-40'][i % 4])} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-t border-border transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-muted/40',
                    selectedIds.has(row.id) && 'bg-primary/5',
                    rowClassName?.(row)
                  )}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`Select row ${row.id}`}
                        className="h-4 w-4 rounded border-border"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'px-4 py-3',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        col.className
                      )}
                    >
                      {col.cell ? col.cell(row) : String((row as Record<string, unknown>)[String(col.key)] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page <= 1}
              className="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
            >«</button>
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
            >‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(pagination.page - 2, totalPages - 4)) + i;
              return (
                <button
                  key={p}
                  onClick={() => pagination.onPageChange(p)}
                  className={cn(
                    'rounded px-2.5 py-1 text-sm',
                    p === pagination.page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                >{p}</button>
              );
            })}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
            >›</button>
            <button
              onClick={() => pagination.onPageChange(totalPages)}
              disabled={pagination.page >= totalPages}
              className="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
            >»</button>
          </div>
        </div>
      )}
    </div>
  );
}
