import React, { ReactNode, useState } from "react";
import clsx from "clsx";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={clsx(
            "absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-sm rounded px-2 py-1 shadow-lg z-50 whitespace-nowrap",
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
