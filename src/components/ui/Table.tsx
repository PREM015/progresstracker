import React from "react";
import clsx from "clsx";

interface TableProps<T> {
  columns: { header: string; accessor: keyof T }[];
  data: T[];
  className?: string;
}

const Table = <T extends Record<string, any>>({ columns, data, className }: TableProps<T>) => {
  return (
    <div className="overflow-x-auto">
      <table className={clsx("min-w-full border border-gray-200 divide-y divide-gray-200", className)}>
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.accessor as string}
                className="px-4 py-2 text-left text-sm font-medium text-gray-700"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td key={col.accessor as string} className="px-4 py-2 text-sm text-gray-700">
                  {row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
