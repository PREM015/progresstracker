import React from "react";
import clsx from "clsx";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div
      className={clsx(
        "bg-white shadow-md rounded-lg p-4 border border-gray-200",
        className
      )}
    >
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      <div>{children}</div>
    </div>
  );
};

export default Card;
