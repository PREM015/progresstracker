import React from "react";
import clsx from "clsx";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

const sizeStyles: Record<string, string> = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  color = "border-blue-600",
  className,
}) => {
  return (
    <div
      className={clsx(
        "border-4 border-t-transparent border-solid rounded-full animate-spin",
        sizeStyles[size],
        color,
        className
      )}
    />
  );
};

export default Spinner;
