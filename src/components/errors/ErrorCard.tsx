import React from "react";
import { AlertTriangle } from "lucide-react";
import RetryButton from "./RetryButton";

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorCard: React.FC<ErrorCardProps> = ({
  message = "Something went wrong. Please try again.",
  onRetry,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg text-center space-y-4 ${className}`}
    >
      <AlertTriangle className="w-12 h-12 text-red-500" />
      <p className="text-red-700 font-medium">{message}</p>
      {onRetry && <RetryButton onClick={onRetry} />}
    </div>
  );
};

export default ErrorCard;
