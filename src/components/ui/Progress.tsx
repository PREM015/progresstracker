import React from "react";
import clsx from "clsx";

interface ProgressProps {
  value: number; // 0 to 100
  className?: string;
  height?: string;
  color?: string;
}

const Progress: React.FC<ProgressProps> = ({
  value,
  className,
  height = "h-3",
  color = "bg-blue-600",
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={clsx("w-full bg-gray-200 rounded", className)} style={{ height }}>
      <div
        className={clsx("rounded", color)}
        style={{ width: `${clampedValue}%`, height }}
      />
    </div>
  );
};

export default Progress;
