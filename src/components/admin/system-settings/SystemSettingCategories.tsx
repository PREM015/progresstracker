'use client';

import { useEffect, useState } from 'react';

export default function SystemSettingCategories() {
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/system-settings');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch categories');
        const grouped = json?.data?.grouped || {};
        const items = Object.keys(grouped).map((key) => ({
          name: key,
          count: grouped[key]?.length || 0,
        }));
        setCategories(items);
      } catch (err) {
        console.error(err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Categories</h3>
      {loading ? (
        <div className="text-zinc-500">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="text-zinc-500">No categories found</div>
      ) : (
        <div className="space-y-3">
          {categories.map((c) => (
            <div key={c.name} className="flex items-center justify-between">
              <span className="text-white text-sm">{c.name}</span>
              <span className="text-xs text-zinc-500">{c.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
