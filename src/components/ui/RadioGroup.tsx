import React, { ReactNode, InputHTMLAttributes } from "react";
import clsx from "clsx";

interface RadioGroupProps {
  name: string;
  options: { label: string; value: string }[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  className,
}) => {
  return (
    <div className={clsx("flex flex-col space-y-2", className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className="inline-flex items-center space-x-2 cursor-pointer"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange && onChange(option.value)}
            className="form-radio h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
};

export default RadioGroup;
