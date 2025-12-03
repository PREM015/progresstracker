"use client";

import React from "react";
import clsx from "clsx";

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl"; // extended sizes
  className?: string;
  fallbackText?: string; // initials or name fallback
  status?: "online" | "offline" | "away"; // optional status badge
}

const sizeStyles: Record<string, string> = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

const statusStyles: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  away: "bg-yellow-400",
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "Avatar",
  size = "md",
  className,
  fallbackText,
  status,
  ...props
}) => {
  const initials = fallbackText
    ? fallbackText
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "A";

  return (
    <div className={clsx("relative inline-block", className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={clsx("rounded-full object-cover", sizeStyles[size])}
          loading="lazy"
          {...props}
        />
      ) : (
        <div
          className={clsx(
            "rounded-full flex items-center justify-center bg-gray-300 text-white font-semibold",
            sizeStyles[size]
          )}
        >
          {initials}
        </div>
      )}

      {status && (
        <span
          className={clsx(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
            statusStyles[status]
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
