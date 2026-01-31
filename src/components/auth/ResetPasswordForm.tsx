import React, { useState } from "react";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";

interface ResetPasswordFormProps {
  onSubmit: (password: string) => void;
  loading?: boolean;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onSubmit, loading }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      alert("Passwords do not match!");
      return;
    }
    onSubmit(password);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="password"
        placeholder="New Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <PasswordStrengthMeter password={password} />
      <input
        type="password"
        placeholder="Confirm Password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
};

export default ResetPasswordForm;
