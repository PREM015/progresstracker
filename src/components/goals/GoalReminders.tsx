'use client';

import React, { useState } from 'react';

interface Reminder {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  enabled: boolean;
}

interface GoalRemindersProps {
  goalId: string;
  className?: string;
}

export const GoalReminders: React.FC<GoalRemindersProps> = ({
  goalId,
  className = '',
}) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({ frequency: 'daily' as const, time: '09:00' });

  const addReminder = async () => {
    const res = await fetch(`/api/goals/${goalId}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReminder),
    });
    const reminder = await res.json();
    setReminders([...reminders, reminder]);
    setShowAddForm(false);
  };

  const toggleReminder = async (id: string) => {
    await fetch(`/api/goals/${goalId}/reminders/${id}/toggle`, { method: 'PATCH' });
    setReminders(reminders.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteReminder = async (id: string) => {
    await fetch(`/api/goals/${goalId}/reminders/${id}`, { method: 'DELETE' });
    setReminders(reminders.filter(r => r.id !== id));
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔔</span>
          <h3 className="text-xl font-bold text-gray-900">Reminders</h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
        >
          + Add
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
          <select
            value={newReminder.frequency}
            onChange={(e) => setNewReminder({ ...newReminder, frequency: e.target.value as any })}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input
            type="time"
            value={newReminder.time}
            onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
          />
          <button onClick={addReminder} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg">
            Create Reminder
          </button>
        </div>
      )}

      <div className="space-y-3">
        {reminders.map((reminder) => (
          <div key={reminder.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={reminder.enabled}
                onChange={() => toggleReminder(reminder.id)}
                className="w-5 h-5"
              />
              <div>
                <div className="font-medium capitalize">{reminder.frequency}</div>
                <div className="text-sm text-gray-500">at {reminder.time}</div>
              </div>
            </div>
            <button onClick={() => deleteReminder(reminder.id)} className="text-red-600 hover:text-red-700">
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalReminders;
