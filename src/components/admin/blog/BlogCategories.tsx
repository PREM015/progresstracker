'use client';

import { useState, useEffect } from 'react';

export function BlogCategories() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/blog/categories');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setCategories(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addCategory = async () => {
        if (!newCategory.trim()) return;
        try {
            await fetch('/api/admin/blog/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategory }),
            });
            setNewCategory('');
            fetchCategories();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading categories...</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="font-semibold text-white mb-4">Blog Categories</div>

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                />
                <button
                    onClick={addCategory}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                >
                    Add
                </button>
            </div>

            <div className="space-y-2">
                {categories.map((cat) => (
                    <div key={cat.id} className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg">
                        <span className="text-white">{cat.name}</span>
                        <span className="text-zinc-500 text-sm">{cat.postCount || 0} posts</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default BlogCategories;
