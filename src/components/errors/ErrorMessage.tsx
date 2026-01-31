import React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className = "" }) => {
  return (
    <div className={`flex items-center space-x-2 text-sm text-red-600 ${className}`}>
      <AlertTriangle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
};

export default ErrorMessage;
