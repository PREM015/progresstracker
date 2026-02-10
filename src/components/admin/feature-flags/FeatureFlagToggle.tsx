import { useAdminFeatures } from '@/hooks/useAdminFeatures';

export function FeatureFlagToggle({ flagKey, isEnabled, onChange }: { flagKey: string; isEnabled: boolean; onChange?: () => void }) {
    const { toggleFlag, isToggling } = useAdminFeatures();

    const handleToggle = async () => {
        try {
            await toggleFlag(flagKey, !isEnabled);
            onChange?.();
        } catch (err: any) {
            alert('Error toggling flag: ' + err.message);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-indigo-600' : 'bg-zinc-700'} ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    );
}
export default FeatureFlagToggle;
