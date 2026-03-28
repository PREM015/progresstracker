// src/components/knowledge-base/KBBreadcrumb.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  crumbs: Crumb[];
}

export function KBBreadcrumb({ crumbs }: Props) {
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-6">
      {crumbs.map((crumb, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-900 dark:text-white font-medium">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default KBBreadcrumb;
