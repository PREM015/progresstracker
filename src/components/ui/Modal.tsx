import React, { ReactNode } from "react";
import clsx from "clsx";

interface ModalProps {
  isOpen: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
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
          "bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative",
          className
        )}
      >
        {title && <h3 className="text-xl font-semibold mb-4">{title}</h3>}
        <div>{children}</div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Modal;
