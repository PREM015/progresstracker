'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: () => void;
}

interface QuickActionsProps {
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  className = '',
}) => {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      id: 'add-entry',
      title: 'Add Entry',
      description: 'Log a new tracker entry',
      icon: '➕',
      color: 'from-blue-500 to-cyan-500',
      action: () => router.push('/tracker/new'),
    },
    {
      id: 'create-goal',
      title: 'Create Goal',
      description: 'Set a new goal',
      icon: '🎯',
      color: 'from-purple-500 to-pink-500',
      action: () => router.push('/goals/new'),
    },
    {
      id: 'sync-platforms',
      title: 'Sync Platforms',
      description: 'Sync all connected platforms',
      icon: '🔄',
      color: 'from-green-500 to-emerald-500',
      action: async () => {
        await fetch('/api/sync/trigger-all', { method: 'POST' });
      },
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'Check your progress',
      icon: '📊',
      color: 'from-orange-500 to-red-500',
      action: () => router.push('/analytics'),
    },
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={`relative overflow-hidden bg-gradient-to-br ${action.color} text-white rounded-xl p-6 hover:scale-105 transition-transform group`}
          >
            <div className="relative z-10">
              <div className="text-4xl mb-3">{action.icon}</div>
              <div className="font-bold mb-1">{action.title}</div>
              <div className="text-xs opacity-90">{action.description}</div>
            </div>
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
