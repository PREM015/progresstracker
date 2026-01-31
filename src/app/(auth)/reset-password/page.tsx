"use client";

import React, { useState } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

const ResetPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const params = useSearchParams();
  const token = params.get("token") || "";

  const handleSubmit = async (password: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Password reset successfully!");
      } else {
        toast.error(data.error || "Failed to reset password.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">Reset Password</h1>
        <ResetPasswordForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
};

export default ResetPasswordPage;
