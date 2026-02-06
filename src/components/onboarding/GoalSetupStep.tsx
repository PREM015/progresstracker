'use client';

import React, { useEffect, useState } from 'react';

interface GoalTemplate {
  id: string;
  title: string;
  target: number;
  category: string;
  description?: string | null;
}

interface GoalSelection {
  templateId: string;
  title: string;
  target: number;
  category: string;
}

interface GoalSetupStepProps {
  onNext: (goals: GoalSelection[]) => void;
  className?: string;
}

export const GoalSetupStep: React.FC<GoalSetupStepProps> = ({
  onNext,
  className = '',
}) => {
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/goals/templates?limit=6');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch templates');
        setTemplates(json?.data?.templates || []);
      } catch (err) {
        console.error(err);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    const selected = templates.filter((t) => selectedIds.includes(t.id));
    const goals: GoalSelection[] = selected.map((t) => ({
      templateId: t.id,
      title: t.title,
      target: t.target,
      category: t.category,
    }));
    onNext(goals);
  };

  return (
    <div className={`bg-white rounded-2xl p-8 ${className}`}>
      <h2 className="text-3xl font-bold mb-2">Set Your Goals</h2>
      <p className="text-gray-600 mb-8">Choose some goals to get started</p>

      <div className="space-y-3 mb-8">
        {loading ? (
          <div className="text-center text-gray-500">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center text-gray-500">No goal templates available</div>
        ) : (
          templates.map((goal) => (
            <label
              key={goal.id}
              className="flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                className="w-6 h-6"
                checked={selectedIds.includes(goal.id)}
                onChange={() => toggleSelect(goal.id)}
              />
              <div className="flex-1">
                <div className="font-semibold">{goal.title}</div>
                <div className="text-sm text-gray-600">Target: {goal.target}</div>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onNext([])}
          className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50"
        >
          Skip
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default GoalSetupStep;
