'use client';

import React from 'react';

interface ReportCardProps {
  title: string;
  description: string;
  type: string;
  icon: string;
  onClick: () => void;
  className?: string;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  title,
  description,
  type,
  icon,
  onClick,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`bg-white border-2 border-gray-200 hover:border-indigo-500 rounded-xl p-6 text-left transition-all ${className}`}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h4 className="text-lg font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium uppercase">
        {type}
      </span>
    </button>
  );
};

export default ReportCard;
