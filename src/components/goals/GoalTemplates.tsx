'use client';

import React, { useState, useEffect } from 'react';

interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  estimatedDays: number;
  icon: string;
}

interface GoalTemplatesProps {
  onSelectTemplate: (template: GoalTemplate) => void;
  className?: string;
}

export const GoalTemplates: React.FC<GoalTemplatesProps> = ({
  onSelectTemplate,
  className = '',
}) => {
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetch('/api/goals/templates')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.templates) {
          setTemplates(data.data.templates);
        } else {
          console.error('Failed to load templates:', data);
          setTemplates([]);
        }
      })
      .catch(err => {
        console.error('Error loading templates:', err);
        setTemplates([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredTemplates = category === 'all'
    ? templates
    : templates.filter(t => t.category === category);

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>;
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Goal Templates</h3>
        <div className="flex gap-2 flex-wrap">
          {['all', 'learning', 'fitness', 'career', 'personal'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${category === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => onSelectTemplate(template)}
          >
            <div className="text-4xl mb-3">{template.icon}</div>
            <h4 className="font-bold text-gray-900 mb-2">{template.title}</h4>
            <p className="text-sm text-gray-600 mb-4">{template.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded capitalize">{template.category}</span>
              <span>{template.estimatedDays} days</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalTemplates;
