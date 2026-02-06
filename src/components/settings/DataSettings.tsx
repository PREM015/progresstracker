"use client";

export function DataSettings() {
    const handleExport = async () => {
        try {
            const res = await fetch('/api/user/export-data');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'data-export.json';
            a.click();
        } catch (err) {
            alert('Export failed');
        }
    };

    const handleDeleteData = async () => {
        if (!confirm('Are you sure? This will delete ALL your data permanently.')) return;

        try {
            await fetch('/api/user/delete', { method: 'DELETE' });
            alert('Account deleted');
            window.location.href = '/';
        } catch (err) {
            alert('Delete failed');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4">Export Your Data</h2>
                <p className="text-gray-600 mb-4">Download a copy of all your data</p>
                <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    Export Data
                </button>
            </div>

            <div className="bg-white border border-red-200 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-red-600">Danger Zone</h2>
                <p className="text-gray-600 mb-4">Permanently delete your account and all data</p>
                <button
                    onClick={handleDeleteData}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    Delete Account
                </button>
            </div>
        </div>
    );
}
