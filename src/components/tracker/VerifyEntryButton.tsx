import { useTracker } from '@/hooks/useTracker';

interface VerifyEntryButtonProps {
    entryId: string;
    isVerified?: boolean;
    onVerify?: (verified: boolean) => void;
    className?: string;
}

export function VerifyEntryButton({
    entryId,
    isVerified = false,
    onVerify,
    className = ''
}: VerifyEntryButtonProps) {
    const { updateEntry, isUpdating } = useTracker();

    const toggleVerify = async () => {
        try {
            const newVerified = !isVerified;
            await updateEntry(entryId, { isVerified: newVerified });
            if (onVerify) onVerify(newVerified);
        } catch (error) {
            console.error('Failed to toggle verification:', error);
        }
    };

    return (
        <button
            onClick={toggleVerify}
            disabled={isUpdating}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isVerified
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${className}`}
            title={isVerified ? 'Click to unverify' : 'Click to verify'}
        >
            {isVerified ? (
                <>
                    <CheckIcon className="w-5 h-5" />
                    Verified
                </>
            ) : (
                <>
                    <UnverifiedIcon className="w-5 h-5" />
                    Verify
                </>
            )}
        </button>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function UnverifiedIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    );
}

export default VerifyEntryButton;
