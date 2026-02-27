'use client';

export function AuditLogExport() {
    const handleExport = async () => {
        try {
            const res = await fetch('/api/admin/audit-logs/export');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${Date.now()}.csv`;
            a.click();
        } catch (err) {
            alert('Export failed');
        }
    };

    return (
        <button
            onClick={handleExport}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
            Export CSV
        </button>
    );
}

export default AuditLogExport;
