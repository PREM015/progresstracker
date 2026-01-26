"use client";

import React, { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
  shadow?: "none" | "sm" | "md" | "lg";
  border?: boolean;
  rounded?: "sm" | "md" | "lg" | "full";
  hoverEffect?: boolean;
  fullWidth?: boolean;
  bgColor?: string;
}

const shadowStyles: Record<string, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};

const roundedStyles: Record<string, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  shadow = "md",
  border = true,
  rounded = "md",
  hoverEffect = false,
  fullWidth = false,
  bgColor,
}) => {
  const bgClass = bgColor ? "" : "bg-white dark:bg-gray-800";
  
  return (
    <div
      className={clsx(
        "p-4",
        shadowStyles[shadow],
        roundedStyles[rounded],
        border && "border border-gray-200 dark:border-gray-700",
        hoverEffect && "hover:shadow-lg transition-shadow",
        fullWidth && "w-full",
        bgClass,
        className
      )}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      {children}
    </div>
  );
};

// Sub-components for structured card
interface CardSubProps {
  children: ReactNode;
  className?: string;
}

// Old Header (kept for backward compatibility)
export const CardHeader: React.FC<CardSubProps> = ({ children, className }) => (
  <div className={clsx("mb-2 font-semibold text-lg", className)}>{children}</div>
);

// New CardTitle
export const CardTitle: React.FC<CardSubProps> = ({ children, className }) => (
  <h3 className={clsx("text-lg font-bold mb-1", className)}>{children}</h3>
);

// New CardDescription
export const CardDescription: React.FC<CardSubProps> = ({ children, className }) => (
  <p className={clsx("text-sm text-gray-500 mb-2", className)}>{children}</p>
);

// CardContent
export const CardContent: React.FC<CardSubProps> = ({ children, className }) => (
  <div className={clsx("mb-2", className)}>{children}</div>
);

// CardFooter
export const CardFooter: React.FC<CardSubProps> = ({ children, className }) => (
  <div className={clsx("mt-2 text-sm text-gray-500", className)}>{children}</div>
);

// Default export for backward compatibility
export default Card;
