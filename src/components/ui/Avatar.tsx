import React from "react";
import clsx from "clsx";

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles: Record<string, string> = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "Avatar",
  size = "md",
  className,
}) => {
  return (
    <img
      src={src || "https://via.placeholder.com/150"}
      alt={alt}
      className={clsx("rounded-full object-cover", sizeStyles[size], className)}
    />
  );
};

export default Avatar;
