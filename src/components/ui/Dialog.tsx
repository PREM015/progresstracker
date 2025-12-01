import React, { ReactNode } from "react";
import clsx from "clsx";

interface DialogProps {
  isOpen: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

const Dialog: React.FC<DialogProps> = ({
  isOpen,
  title,
  children,
  onClose,
  className,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className={clsx(
          "bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative",
          className
        )}
      >
        {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
        <div>{children}</div>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Dialog;
