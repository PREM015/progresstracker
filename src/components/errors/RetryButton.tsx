import React from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface RetryButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}

const RetryButton: React.FC<RetryButtonProps> = ({
  onClick,
  isLoading = false,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`flex items-center justify-center px-4 py-2 space-x-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
      <span>{isLoading ? "Retrying..." : "Retry"}</span>
    </button>
  );
};

export default RetryButton;
