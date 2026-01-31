"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

const VerifyEmailPage: React.FC = () => {
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");

  const verifyEmail = async () => {
    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST" });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    verifyEmail();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6 text-center">
        {status === "pending" && <p className="text-gray-600">Verifying your email...</p>}
        {status === "success" && <p className="text-green-600 font-semibold">Email verified successfully!</p>}
        {status === "error" && <p className="text-red-600 font-semibold">Failed to verify email.</p>}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
