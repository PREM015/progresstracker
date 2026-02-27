'use client';
export function LogExport() {
    const handleExport = async () => { const res = await fetch('/api/admin/logs/export'); const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `logs-${Date.now()}.csv`; a.click(); };
    return <button onClick={handleExport} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Export Logs</button>;
}
export default LogExport;
