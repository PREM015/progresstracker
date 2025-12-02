import React, { SelectHTMLAttributes } from "react";
import clsx from "clsx";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { label: string; value: string }[]; // optional
  className?: string;
  placeholder?: string; // optional placeholder
}

const Select: React.FC<SelectProps> = ({
  label,
  options = [], // default empty array
  className,
  placeholder,
  ...props
}) => {
  return (
    <div className={clsx("flex flex-col space-y-1", className)}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
