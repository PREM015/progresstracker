/**
 * Component: Pagination
 * Location: components/ui/Pagination.tsx
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  siblingCount?: number;
  className?: string;
}

const ChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
  </svg>
);

const ChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
  </svg>
);

const ChevronsLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M15.79 5.23a.75.75 0 01-.02 1.06L11.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02zM9.79 5.23a.75.75 0 01-.02 1.06L5.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
  </svg>
);

const ChevronsRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M4.21 14.77a.75.75 0 01.02-1.06L8.168 10 4.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02zM10.21 14.77a.75.75 0 01.02-1.06L14.168 10l-3.938-3.71a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
  </svg>
);

const getPageNumbers = (current: number, total: number, siblings: number): (number | 'dots')[] => {
  const pages: (number | 'dots')[] = [];
  const showStart = Math.max(1, current - siblings);
  const showEnd = Math.min(total, current + siblings);

  if (showStart > 1) { pages.push(1); if (showStart > 2) pages.push('dots'); }
  for (let i = showStart; i <= showEnd; i++) pages.push(i);
  if (showEnd < total) { if (showEnd < total - 1) pages.push('dots'); pages.push(total); }
  return pages;
};

export const Pagination: React.FC<PaginationProps> = ({
  currentPage, totalPages, onPageChange, showFirstLast = true, siblingCount = 1, className
}) => {
  const pages = getPageNumbers(currentPage, totalPages, siblingCount);

  const PageButton: React.FC<{ page: number; active?: boolean }> = ({ page, active }) => (
    <button
      onClick={() => onPageChange(page)}
      className={cn(
        'h-9 w-9 rounded-md text-sm font-medium transition-colors',
        active ? 'bg-[var(--primary)] text-white' : 'text-[var(--foreground)] hover:bg-[var(--sidebar-bg)]'
      )}
    >
      {page}
    </button>
  );

  const NavButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-9 w-9 rounded-md text-[var(--text-muted)] hover:bg-[var(--sidebar-bg)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
    >
      {children}
    </button>
  );

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {showFirstLast && (
        <NavButton onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          <ChevronsLeft />
        </NavButton>
      )}
      <NavButton onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        <ChevronLeft />
      </NavButton>
      {pages.map((page, idx) =>
        page === 'dots' ? (
          <span key={`dots-${idx}`} className="h-9 w-9 flex items-center justify-center text-[var(--text-muted)]">...</span>
        ) : (
          <PageButton key={page} page={page} active={page === currentPage} />
        )
      )}
      <NavButton onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        <ChevronRight />
      </NavButton>
      {showFirstLast && (
        <NavButton onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
          <ChevronsRight />
        </NavButton>
      )}
    </div>
  );
};

export default Pagination;
