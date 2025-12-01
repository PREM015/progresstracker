import React from "react";
import clsx from "clsx";

interface AlertProps {
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
  description?: string;
  className?: string;
}

const variantStyles: Record<string, string> = {
  success: "bg-green-100 text-green-800 border-green-300",
  error: "bg-red-100 text-red-800 border-red-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  info: "bg-blue-100 text-blue-800 border-blue-300",
};

const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  description,
  className,
}) => {
  return (
    <div
      className={clsx(
        "border-l-4 p-4 rounded-md",
        variantStyles[variant],
        className
      )}
      role="alert"
    >
      {title && <p className="font-bold">{title}</p>}
      {description && <p>{description}</p>}
    </div>
  );
};

export default Alert;
