'use client';
export function CacheClearButton({ cacheKey }: {cache Key?: string}) {
    const handleClear = async () => {
        await fetch('/api/admin/cache/clear', { method: 'POST', body: JSON.stringify({ key: cacheKey }), headers: { 'Content-Type': 'application/json' } });
        alert('Cache cleared');
    };
    return <button onClick={handleClear} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg">Clear Cache</button>;
}
export default CacheClearButton;
