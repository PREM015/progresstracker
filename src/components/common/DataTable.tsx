import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import React from 'react';

interface DataTableProps<T> {
    data: T[];
    columns: {
        key: keyof T;
        label: string;
        render?: (value: any, row: T) => React.ReactNode;
    }[];
    onRowClick?: (row: T) => void;
}

export default function DataTable<T extends { id: string | number }>({ data, columns, onRowClick }: DataTableProps<T>) {
    return (
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
                        <tr>
                            {columns.map(col => (
                                <th key={String(col.key)} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                        <AnimatePresence mode='wait'>
                            {data.map((row, index) => (
                                <motion.tr
                                    key={row.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    onClick={() => onRowClick?.(row)}
                                    layoutId={`row-${row.id}`}
                                    className={cn(
                                        "transition-colors",
                                        onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900' : ''
                                    )}
                                    whileHover={{ backgroundColor: "rgba(160, 124, 254, 0.05)" }}
                                >
                                    {columns.map(col => (
                                        <td key={String(col.key)} className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                            {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                                        </td>
                                    ))}
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
