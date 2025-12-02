import React, { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  isLoading?: boolean;
}

const variantStyles: Record<string, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-transparent hover:bg-gray-100",
  outline: "border border-gray-300 hover:bg-gray-100",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-5 py-3 text-lg",
};

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  leftIcon,
  isLoading,
  children,
  ...buttonProps // ✅ safe
}) => {
  return (
    <button
      {...buttonProps}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={isLoading || buttonProps.disabled}
    >
      {isLoading ? "Loading..." : (
        <>
          {leftIcon}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
