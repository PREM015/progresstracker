"use client";

import * as React from "react";
import clsx from "clsx";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  autoResize?: boolean;
  showCount?: boolean;
  maxLength?: number;
}

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      hint,
      autoResize = false,
      showCount = false,
      maxLength,
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(
      null
    );

    // merge refs
    React.useImperativeHandle(ref, () => innerRef.current!);

    // auto resize
    React.useEffect(() => {
      if (!autoResize || !innerRef.current) return;
      innerRef.current.style.height = "auto";
      innerRef.current.style.height =
        innerRef.current.scrollHeight + "px";
    }, [value, autoResize]);

    const handleChange = (
      e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      onChange?.(e);
    };

    const length =
      typeof value === "string" ? value.length : 0;

    return (
      <div className={clsx("space-y-1", containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}

        <textarea
          ref={innerRef}
          value={value}
          maxLength={maxLength}
          onChange={handleChange}
          className={clsx(
            "w-full min-h-[80px] rounded-md border px-3 py-2 text-sm",
            "bg-white dark:bg-gray-800 dark:text-white",
            "border-gray-300 dark:border-gray-600",
            "placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />

        {/* Footer row */}
        {(error || hint || showCount) && (
          <div className="flex justify-between text-xs">
            <div>
              {error && (
                <p className="text-red-500">{error}</p>
              )}
              {!error && hint && (
                <p className="text-gray-500">{hint}</p>
              )}
            </div>

            {showCount && maxLength !== undefined && (
              <span
                className={clsx(
                  "text-gray-500",
                  length >= maxLength && "text-red-500"
                )}
              >
                {length}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
