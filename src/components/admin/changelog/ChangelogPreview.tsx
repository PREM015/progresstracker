'use client';
export function ChangelogPreview({ entry }: any) { return <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><h3 className="text-xl font-bold text-white mb-2">v{entry?.version}</h3><p className="text-zinc-400">{entry?.changes}</p></div>; }
export default ChangelogPreview;
