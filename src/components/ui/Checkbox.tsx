import React, { InputHTMLAttributes } from "react";
import clsx from "clsx";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, className, ...props }) => {
  return (
    <label className={clsx("inline-flex items-center space-x-2", className)}>
      <input
        type="checkbox"
        className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  );
};

export default Checkbox;
