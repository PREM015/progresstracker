import React, { useEffect } from "react";
import clsx from "clsx";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number; // in milliseconds
  onClose: () => void;
  className?: string;
}

const typeStyles: Record<string, string> = {
  success: "bg-green-100 text-green-800 border-green-300",
  error: "bg-red-100 text-red-800 border-red-300",
  info: "bg-blue-100 text-blue-800 border-blue-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
};

const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 3000,
  onClose,
  className,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={clsx(
        "fixed top-4 right-4 border-l-4 p-4 rounded shadow-md",
        typeStyles[type],
        className
      )}
    >
      {message}
    </div>
  );
};

export default Toast;
