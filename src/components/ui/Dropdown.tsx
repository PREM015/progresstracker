import React, { useState, ReactNode } from "react";
import clsx from "clsx";

interface DropdownProps {
  label?: string;
  trigger?: ReactNode;
  children: ReactNode;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ label, trigger, children, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={clsx("relative inline-block", className)}>
      {React.isValidElement(trigger) ? (
        // If the trigger is already an element (e.g., a <Button />), clone it and attach toggle handler
        React.cloneElement(trigger as React.ReactElement, {
          onClick: (e: any) => {
            // call existing onClick if present
            if (typeof (trigger as any).props.onClick === 'function') (trigger as any).props.onClick(e)
            setIsOpen((s) => !s)
          },
        })
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {trigger ?? label}
        </button>
      )}
      {isOpen && (
        <div className="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
