import React, { useState } from "react";

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => void;
  loading?: boolean;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSubmit, loading }) => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    onSubmit(email);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        {loading ? "Sending..." : "Send Reset Link"}
      </button>
    </form>
  );
};

export default ForgotPasswordForm;
