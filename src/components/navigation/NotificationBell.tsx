'use client';

import React, { useState } from 'react';

interface NotificationBellProps {
  count?: number;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  count = 0,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg"
      >
        <span className="text-2xl">🔔</span>
        {count > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-xl shadow-2xl z-50">
          <div className="p-4 border-b">
            <h4 className="font-bold">Notifications ({count})</h4>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {count === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <span className="text-4xl mb-2 block">🔔</span>
                No new notifications
              </div>
            ) : (
              <div className="p-4">Notifications would appear here</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
