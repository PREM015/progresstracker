import * as React from "react";
import clsx from "clsx";

/* -----------------------------------------------------------------------------
 Types
----------------------------------------------------------------------------- */

type Option = { label: string; value: string };

interface BaseSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: Option[];
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

/* -----------------------------------------------------------------------------
 Context (for compatibility with shadcn-style API)
----------------------------------------------------------------------------- */

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

/* -----------------------------------------------------------------------------
 Main Select (root)
----------------------------------------------------------------------------- */

export function Select({
  value,
  onChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: (val) =>
          onChange?.({
            target: { value: val },
          } as React.ChangeEvent<HTMLSelectElement>),
      }}
    >
      {children}
    </SelectContext.Provider>
  );
}

/* -----------------------------------------------------------------------------
 SelectTrigger
----------------------------------------------------------------------------- */

export function SelectTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 cursor-pointer",
        "focus-within:ring-2 focus-within:ring-blue-500",
        "dark:bg-gray-700 dark:text-white",
        className
      )}
    >
      {children}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 SelectValue
----------------------------------------------------------------------------- */

export function SelectValue({
  placeholder,
}: {
  placeholder?: string;
}) {
  const ctx = React.useContext(SelectContext);
  return (
    <span className="text-sm text-gray-700 dark:text-gray-300">
      {ctx?.value || placeholder || "Select"}
    </span>
  );
}

/* -----------------------------------------------------------------------------
 SelectContent (actual <select>)
----------------------------------------------------------------------------- */

export function SelectContent({
  options,
  className,
  ...props
}: BaseSelectProps) {
  const ctx = React.useContext(SelectContext);

  return (
    <select
      className={clsx(
        "mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
        "dark:bg-gray-700 dark:text-white",
        className
      )}
      value={ctx?.value}
      onChange={(e) => ctx?.onValueChange?.(e.target.value)}
      {...props}
    >
      {props.placeholder && (
        <option value="" disabled>
          {props.placeholder}
        </option>
      )}

      {options &&
        options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}

      {!options && props.children}
    </select>
  );
}

/* -----------------------------------------------------------------------------
 SelectItem
----------------------------------------------------------------------------- */

export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <option value={value}>{children}</option>;
}

/* -----------------------------------------------------------------------------
 Default export (backward compatibility ✅)
----------------------------------------------------------------------------- */

const LegacySelect: React.FC<BaseSelectProps> = ({
  label,
  options,
  className,
  placeholder,
  children,
  ...props
}) => {
  const hasOptions = Array.isArray(options) && options.length > 0;

  return (
    <div className={clsx("flex flex-col space-y-1", className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <select
        className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   dark:bg-gray-700 dark:text-white"
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}

        {hasOptions &&
          options!.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}

        {!hasOptions && children}
      </select>
    </div>
  );
};

export default LegacySelect;
