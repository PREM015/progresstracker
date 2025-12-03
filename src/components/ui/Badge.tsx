"use client";

import React, { useState } from "react";
import clsx from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "error" | "warning" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
  color?: string; // custom background color
  textColor?: string; // custom text color
  icon?: React.ReactNode; // optional icon
  closable?: boolean; // show close button
  onClose?: () => void; // close callback
}

const variantStyles: Record<string, string> = {
  default: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const sizeStyles: Record<string, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  className,
  color,
  textColor,
  icon,
  closable = false,
  onClose,
}) => {
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <span
      className={clsx(
        "inline-flex items-center font-semibold rounded-full",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      style={{
        backgroundColor: color,
        color: textColor,
      }}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
      {closable && (
        <button
          type="button"
          onClick={handleClose}
          className="ml-2 text-xs font-bold focus:outline-none hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close badge"
        >
          ×
        </button>
      )}
    </span>
  );
};

export default Badge;
