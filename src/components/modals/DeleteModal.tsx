interface DeleteModalProps {
    isOpen: boolean;
    itemName: string;
    onDelete: () => void;
    onClose: () => void;
}

export default function DeleteModal({ isOpen, itemName, onDelete, onClose }: DeleteModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-2">Delete {itemName}?</h2>
                <p className="text-gray-600 mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button onClick={onDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
