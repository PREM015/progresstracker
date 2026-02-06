'use client';
export function FeatureFlagToggle({ flagKey, isEnabled, onChange }: any) {
    const handleToggle = async () => {
        await fetch(`/api/admin/feature-flags/${flagKey}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isEnabled: !isEnabled }) });
        onChange?.();
    };
    return <button onClick={handleToggle} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-indigo-600' : 'bg-zinc-700'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} /></button>;
}
export default FeatureFlagToggle;
