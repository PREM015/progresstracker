"use client";

import React, { useState } from "react";
import TwoFactorForm from "@/components/auth/TwoFactorForm";
import { toast } from "react-hot-toast";

const TwoFactorPage: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (code: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) toast.success("2FA verified!");
      else toast.error(data.error || "Invalid code");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">Two-Factor Authentication</h1>
        <TwoFactorForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
};

export default TwoFactorPage;
