"use client";

import * as React from "react";
import clsx from "clsx";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  className?: string;
  label?: React.ReactNode;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, checked, defaultChecked, disabled, ...props }, ref) => {
    return (
      <label
        className={clsx(
          "inline-flex items-center gap-2 cursor-pointer select-none",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <span className="relative inline-flex items-center">
          <input
            ref={ref}
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            {...props}
          />
          <span
            className={clsx(
              "w-11 h-6 rounded-full transition-colors",
              "bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500",
              "peer-checked:bg-blue-600"
            )}
          />
          <span
            className={clsx(
              "absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
              "peer-checked:translate-x-5"
            )}
          />
        </span>

        {label && (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {label}
          </span>
        )}
      </label>
    );
  }
);

Switch.displayName = "Switch";

export default Switch;
