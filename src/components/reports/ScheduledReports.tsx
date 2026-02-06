'use client';

import React, { useState } from 'react';

interface ScheduledReportsProps {
  className?: string;
}

export const ScheduledReports: React.FC<ScheduledReportsProps> = ({
  className = '',
}) => {
  const [schedule, setSchedule] = useState({
    weekly: true,
    monthly: true,
    email: 'user@example.com',
  });

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Scheduled Reports</h3>

      <div className="space-y-6 mb-6">
        <div>
          <label className="block font-medium mb-3">Email Address</label>
          <input
            type="email"
            value={schedule.email}
            onChange={(e) => setSchedule({ ...schedule, email: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={schedule.weekly}
              onChange={(e) => setSchedule({ ...schedule, weekly: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium">Weekly Report</div>
              <div className="text-sm text-gray-600">Every Monday at 9 AM</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={schedule.monthly}
              onChange={(e) => setSchedule({ ...schedule, monthly: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium">Monthly Report</div>
              <div className="text-sm text-gray-600">First day of each month</div>
            </div>
          </label>
        </div>
      </div>

      <button className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
        Save Schedule
      </button>
    </div>
  );
};

export default ScheduledReports;
