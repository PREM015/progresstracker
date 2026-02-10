import { useAdminMaintenance } from '@/hooks/useAdminMaintenance';

export function CacheClearButton({ cacheKey }: { cacheKey?: string }) {
    const { clearCache, isClearingCache } = useAdminMaintenance();

    const handleClear = async () => {
        try {
            await clearCache(cacheKey);
            alert('Cache cleared');
        } catch (err: any) {
            alert('Error clearing cache: ' + err.message);
        }
    };

    return (
        <button
            onClick={handleClear}
            disabled={isClearingCache}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg disabled:opacity-50"
        >
            {isClearingCache ? 'Clearing...' : 'Clear Cache'}
        </button>
    );
}
export default CacheClearButton;
