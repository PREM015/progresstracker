import React from "react";
import clsx from "clsx";

interface BadgeProps {
  text: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-gray-200 text-gray-800",
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  warning: "bg-yellow-100 text-yellow-800",
  info: "bg-blue-100 text-blue-800",
};

const Badge: React.FC<BadgeProps> = ({
  text,
  variant = "default",
  className,
}) => {
  return (
    <span
      className={clsx(
        "inline-block px-2 py-1 text-sm font-semibold rounded-full",
        variantStyles[variant],
        className
      )}
    >
      {text}
    </span>
  );
};

export default Badge;
