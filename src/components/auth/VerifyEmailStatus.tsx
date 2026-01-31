"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";

interface VerifyEmailStatusProps {
  email: string;
  isVerified: boolean;
}

const VerifyEmailStatus: React.FC<VerifyEmailStatusProps> = ({ email, isVerified }) => {
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Failed to resend verification email");

      toast.success("Verification email sent!");
    } catch (err) {
      toast.error((err as Error).message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center space-y-4">
      {isVerified ? (
        <p className="text-green-600 dark:text-green-400 font-semibold">
          ✅ Your email <span className="font-medium">{email}</span> is verified.
        </p>
      ) : (
        <>
          <p className="text-red-600 dark:text-red-400 font-semibold">
            ⚠ Your email <span className="font-medium">{email}</span> is not verified.
          </p>
          <button
            onClick={handleResend}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Resending..." : "Resend Verification Email"}
          </button>
        </>
      )}
    </div>
  );
};

export default VerifyEmailStatus;
