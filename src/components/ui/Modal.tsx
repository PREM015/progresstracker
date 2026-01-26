import React, { ReactNode } from "react";
import clsx from "clsx";

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  open,
  isOpen,
  title,
  children,
  onClose,
  className,
}) => {
  const modalOpen = open ?? isOpen ?? false;
  if (!modalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={clsx(
          "bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 relative border border-gray-200 dark:border-gray-700",
          className
        )}
      >
        {title && <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>}
        <div>{children}</div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Modal;
