"use client";

import React, { ReactNode } from "react";
import clsx from "clsx";
import Button from "@/components/ui/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
  isLoading?: boolean;
  children?: ReactNode;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDangerous = false,
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className={clsx(
        "relative bg-white dark:bg-gray-900 rounded-lg shadow-xl",
        "max-w-md w-full mx-4 p-6 border border-gray-200 dark:border-gray-700"
      )}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {description}
          </p>
        )}
        {children}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className={clsx(
              "flex-1",
              isDangerous && "bg-red-600 hover:bg-red-700 text-white"
            )}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
