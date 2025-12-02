import React, { SelectHTMLAttributes } from "react";
import clsx from "clsx";

type Option = { label: string; value: string };

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: Option[];       // ✅ optional
  className?: string;
  placeholder?: string;
  children?: React.ReactNode; // ✅ REQUIRED
}

const Select: React.FC<SelectProps> = ({
  label,
  options,
  className,
  placeholder,
  children,
  ...props
}) => {
  const hasOptions = Array.isArray(options) && options.length > 0;

  return (
    <div className={clsx("flex flex-col space-y-1", className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <select
        className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   dark:bg-gray-700 dark:text-white"
        {...props}
      >
        {/* ✅ options-based API */}
        {hasOptions &&
          options!.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}

        {/* ✅ children-based API (your tracker uses this) */}
        {!hasOptions && children}
      </select>
    </div>
  );
};

export default Select;
