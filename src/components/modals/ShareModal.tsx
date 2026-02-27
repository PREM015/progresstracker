interface ShareModalProps {
    isOpen: boolean;
    url: string;
    title: string;
    onClose: () => void;
}

export default function ShareModal({ isOpen, url, title, onClose }: ShareModalProps) {
    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    const shareOptions = [
        { name: 'Twitter', icon: '🐦', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
        { name: 'Facebook', icon: '👍', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
        { name: 'LinkedIn', icon: '💼', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Share</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
                </div>

                <div className="mb-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={url}
                            readOnly
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50"
                        />
                        <button
                            onClick={handleCopy}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Copy
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {shareOptions.map(option => (
                        <a
                            key={option.name}
                            href={option.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                            <span className="text-2xl">{option.icon}</span>
                            <span className="text-xs text-gray-600">{option.name}</span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
