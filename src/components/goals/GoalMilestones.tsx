'use client';

import React, { useState, useEffect } from 'react';

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  achieved: boolean;
  achievedAt?: string;
}

interface GoalMilestonesProps {
  goalId: string;
  currentValue: number;
  onAddMilestone?: (milestone: Omit<Milestone, 'id' | 'achieved'>) => void;
  className?: string;
}

export const GoalMilestones: React.FC<GoalMilestonesProps> = ({
  goalId,
  currentValue,
  onAddMilestone,
  className = '',
}) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', targetValue: 0 });

  useEffect(() => {
    fetch(`/api/goals/${goalId}/milestones`)
      .then(r => r.json())
      .then(data => setMilestones(data))
      .catch(console.error);
  }, [goalId]);

  const handleAdd = () => {
    if (onAddMilestone) {
      onAddMilestone(newMilestone);
      setNewMilestone({ title: '', description: '', targetValue: 0 });
      setShowAddForm(false);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Milestones</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          {showAddForm ? 'Cancel' : '+ Add Milestone'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
          <input
            type="text"
            value={newMilestone.title}
            onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
            placeholder="Milestone title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            value={newMilestone.description}
            onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
            placeholder="Description (optional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="number"
            value={newMilestone.targetValue}
            onChange={(e) => setNewMilestone({ ...newMilestone, targetValue: parseInt(e.target.value) })}
            placeholder="Target value"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={handleAdd}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Add Milestone
          </button>
        </div>
      )}

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No milestones yet. Add one to track your progress!
          </div>
        ) : (
          milestones.map((milestone, idx) => {
            const isAchieved = milestone.achieved || currentValue >= milestone.targetValue;

            return (
              <div
                key={milestone.id}
                className={`p-4 border-2 rounded-lg transition-all ${isAchieved ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isAchieved ? 'bg-green-500' : 'bg-gray-300 text-gray-600'
                    }`}>
                    {isAchieved ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{milestone.title}</h4>
                    {milestone.description && (
                      <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">Target: {milestone.targetValue}</span>
                      {isAchieved && milestone.achievedAt && (
                        <span className="text-green-600 font-medium">
                          ✓ Achieved {new Date(milestone.achievedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GoalMilestones;
