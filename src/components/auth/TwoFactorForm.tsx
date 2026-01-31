import React, { useState } from "react";

interface TwoFactorFormProps {
  onSubmit: (code: string) => void;
  loading?: boolean;
}

const TwoFactorForm: React.FC<TwoFactorFormProps> = ({ onSubmit, loading }) => {
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    onSubmit(code);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Enter 6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
        maxLength={6}
        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        {loading ? "Verifying..." : "Verify"}
      </button>
    </form>
  );
};

export default TwoFactorForm;
