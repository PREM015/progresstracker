import React, { InputHTMLAttributes } from "react";
import clsx from "clsx";

interface SwitchProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({ className, ...props }) => {
  return (
    <label className={clsx("relative inline-flex items-center cursor-pointer", className)}>
      <input
        type="checkbox"
        className="sr-only peer"
        {...props}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 transition-all duration-200" />
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md peer-checked:translate-x-5 transition-all duration-200" />
    </label>
  );
};

export default Switch;
