'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

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
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 tracking-tight">Rapid Goal Setup</h3>
        <div className="flex gap-2.5 flex-wrap">
          {['all', 'learning', 'fitness', 'career', 'personal'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 uppercase tracking-widest",
                category === cat
                  ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 shadow-lg shadow-zinc-200 dark:shadow-none"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="glass-card p-6 cursor-pointer group hover:border-indigo-500/50"
            onClick={() => onSelectTemplate(template)}
          >
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-500 ease-out">{template.icon}</div>
            <h4 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2 text-lg tracking-tight group-hover:text-indigo-500 transition-colors">{template.title}</h4>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed font-medium line-clamp-2">{template.description}</p>
            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
              <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-[10px] font-black uppercase tracking-widest">{template.category}</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{template.estimatedDays} days</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalTemplates;
