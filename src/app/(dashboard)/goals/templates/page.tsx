"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoalTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/goals/templates')
      .then(r => r.json())
      .then(data => setTemplates(data.templates || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleUseTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/goals/templates/${templateId}/use`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        router.push(`/goals/${data.goal.id}`);
      }
    } catch (error) {
      console.error('Failed to create goal from template:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Goal Templates</h1>
          <p className="text-gray-600 mt-2">Jumpstart your progress with pre-made goal templates</p>
        </div>

        {templates.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">📋</span>
            <p className="mt-4 text-gray-500">No templates available</p>
            <p className="text-sm text-gray-400 mt-2">Check back later for curated goal templates</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <div key={template.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
                <div className="text-3xl mb-3">{template.icon || '🎯'}</div>
                <h3 className="text-lg font-bold text-gray-900">{template.title}</h3>
                <p className="text-sm text-gray-600 mt-2">{template.description}</p>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Target</span>
                    <span className="font-medium text-gray-900">{template.targetValue} {template.metric}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Type</span>
                    <span className="font-medium text-gray-900">{template.type}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleUseTemplate(template.id)}
                  className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
