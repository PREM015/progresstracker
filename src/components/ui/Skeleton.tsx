import React from "react";
import clsx from "clsx";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  circle?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "1rem",
  circle = false,
  className,
}) => {
  return (
    <div
      className={clsx(
        "bg-gray-200 animate-pulse",
        circle && "rounded-full",
        !circle && "rounded-md",
        className
      )}
      style={{
        width,
        height,
      }}
    />
  );
};

export default Skeleton;
