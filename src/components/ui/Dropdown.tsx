import React, { useState, ReactNode } from "react";
import clsx from "clsx";

interface DropdownProps {
  label: string;
  children: ReactNode;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ label, children, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={clsx("relative inline-block", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
