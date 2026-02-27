'use client';

import { useState } from 'react';

export function AdminSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const search = async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            setResults(data.results || []);
            setIsOpen(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        const timer = setTimeout(() => search(value), 300);
        return () => clearTimeout(timer);
    };

    return (
        <div className="relative w-full max-w-2xl">
            <div className="relative">
                <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    onFocus={() => query && setIsOpen(true)}
                    placeholder="Search users, logs, settings..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
                    {results.map((result, i) => (
                        <a
                            key={i}
                            href={result.url}
                            className="block p-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <div className="flex items-center gap-3">
                                <span className="px-2 py-1 rounded text-xs bg-indigo-500/20 text-indigo-400">
                                    {result.type}
                                </span>
                                <div className="flex-1">
                                    <div className="text-white font-medium">{result.title}</div>
                                    {result.description && (
                                        <div className="text-zinc-500 text-sm">{result.description}</div>
                                    )}
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AdminSearch;
