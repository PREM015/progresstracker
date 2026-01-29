
"use client";

import React, { InputHTMLAttributes } from "react";
import clsx from "clsx";

export type InputVariant = "default" | "outline" | "ghost" | "error";
export type InputSize = "sm" | "md" | "lg";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  variant?: InputVariant;
  size?: InputSize;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

const variantStyles: Record<InputVariant, string> = {
  default: "border border-gray-300 focus:ring-blue-500 focus:border-blue-500",
  outline: "border border-gray-400 focus:ring-blue-500 focus:border-blue-500",
  ghost: "border-none bg-gray-100 focus:ring-blue-500",
  error: "border border-red-500 text-red-700 focus:ring-red-500 focus:border-red-500",
};

const sizeStyles: Record<InputSize, string> = {
  sm: "px-2 py-1 text-sm",
  md: "px-3 py-2 text-base",
  lg: "px-4 py-3 text-lg",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      variant = "default",
      size = "md",
      className,
      leftIcon,
      rightIcon,
      fullWidth = false,
      clearable = false,
      onClear,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className={clsx("flex flex-col", fullWidth && "w-full", className)}>
        {label && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && <div className="absolute left-2">{leftIcon}</div>}
          <input
            ref={ref}
            className={clsx(
              "rounded-md w-full focus:outline-none ring-1",
              variantStyles[variant],
              sizeStyles[size],
              leftIcon && "pl-8",
              rightIcon || clearable ? "pr-8" : "",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            disabled={disabled}
            {...props}
          />
          {rightIcon && <div className="absolute right-2">{rightIcon}</div>}
          {clearable && props.value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        {helperText && (
          <span className={clsx("text-xs mt-1", variant === "error" ? "text-red-500" : "text-gray-500")}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// Default export for backward compatibility
export default Input;

