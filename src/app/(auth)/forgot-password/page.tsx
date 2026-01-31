"use client";

import React, { useState } from "react";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { toast } from "react-hot-toast";

const ForgotPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Password reset link sent to your email.");
      } else {
        toast.error(data.error || "Something went wrong.");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">Forgot Password</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Enter your email to receive a password reset link
        </p>
        <ForgotPasswordForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
