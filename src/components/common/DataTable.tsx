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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        {columns.map(col => (
                            <th key={String(col.key)} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.map(row => (
                        <tr
                            key={row.id}
                            onClick={() => onRowClick?.(row)}
                            className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                        >
                            {columns.map(col => (
                                <td key={String(col.key)} className="px-6 py-4 text-sm text-gray-900">
                                    {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
