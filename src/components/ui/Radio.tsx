/**
 * Component: Radio
 * Location: components/ui/Radio.tsx
 * 
 * Description: Premium Radio and RadioGroup components with context and animations
 */

'use client';

import React, { createContext, useContext } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ===== CONTEXT =====
interface RadioGroupContextProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

const RadioGroupContext = createContext<RadioGroupContextProps | undefined>(undefined);

// ===== RADIOGROUP =====
export interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  children: React.ReactNode;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  name,
  children,
  className,
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);

  const selectedValue = value !== undefined ? value : internalValue;

  const handleChange = (newValue: string) => {
    if (disabled) return;
    if (value === undefined) setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <RadioGroupContext.Provider
      value={{
        value: selectedValue,
        onChange: handleChange,
        disabled,
        name
      }}
    >
      <div
        role="radiogroup"
        className={cn('flex flex-col gap-2', className)}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
};

// ===== RADIO =====
export interface RadioProps {
  value: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const Radio: React.FC<RadioProps> = ({
  value,
  label,
  description,
  disabled = false,
  className,
  id,
}) => {
  const context = useContext(RadioGroupContext);
  const isSelected = context?.value === value;
  const isDisabled = disabled || context?.disabled;
  const radioId = id || `radio-${value}`;

  const handleClick = () => {
    if (!isDisabled) {
      context?.onChange?.(value);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer',
        isSelected
          ? 'bg-[var(--primary)]/5 border-[var(--primary)] shadow-sm'
          : 'bg-transparent border-[var(--card-border)] hover:border-[var(--primary)]/30',
        isDisabled && 'opacity-50 cursor-not-allowed grayscale',
        className
      )}
    >
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          type="radio"
          id={radioId}
          name={context?.name}
          value={value}
          checked={isSelected}
          disabled={isDisabled}
          onChange={() => { }} // Handled by div click for better UX
          className="peer sr-only"
        />

        {/* Custom Radio Circle */}
        <div className={cn(
          'w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center',
          isSelected ? 'border-[var(--primary)]' : 'border-[var(--text-muted)] group-hover:border-[var(--primary)]/50'
        )}>
          {isSelected && (
            <motion.div
              layoutId="radio-dot"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]"
            />
          )}
        </div>
      </div>

      <div className="flex flex-col select-none">
        {label && (
          <label
            htmlFor={radioId}
            className={cn(
              'text-sm font-bold leading-none cursor-pointer',
              isSelected ? 'text-[var(--foreground)]' : 'text-[var(--text-muted)] group-hover:text-[var(--foreground)]'
            )}
          >
            {label}
          </label>
        )}
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default Radio;
