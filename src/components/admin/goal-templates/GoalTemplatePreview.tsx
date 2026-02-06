'use client';
export function GoalTemplatePreview({ template }: any) { return <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><h2 className="text-xl font-bold text-white mb-2">{template?.name}</h2><p className="text-zinc-400">{template?.description}</p></div>; }
export default GoalTemplatePreview;
