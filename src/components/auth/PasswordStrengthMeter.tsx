import React from "react";

interface PasswordStrengthMeterProps {
  password: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const getColor = () => {
    switch (score) {
      case 0:
      case 1:
        return "bg-red-500";
      case 2:
        return "bg-yellow-400";
      case 3:
        return "bg-green-400";
      case 4:
        return "bg-green-600";
      default:
        return "bg-gray-200";
    }
  };

  return (
    <div className="w-full h-2 bg-gray-200 rounded mt-1">
      <div className={`h-2 rounded ${getColor()}`} style={{ width: `${(score / 4) * 100}%` }} />
    </div>
  );
};

export default PasswordStrengthMeter;
