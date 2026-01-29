
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type LabelVariant = "default" | "small" | "large";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
  variant?: LabelVariant;
  children: React.ReactNode;
}

const labelVariantClasses: Record<LabelVariant, string> = {
  default: "text-sm font-medium leading-none",
  small: "text-xs font-medium leading-none",
  large: "text-lg font-semibold leading-none",
};

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          labelVariantClasses[variant],
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        {...props}
      >
        {children}
      </label>
    );
  }
);

Label.displayName = "Label";

export default Label;
