'use client';

import React, { useState, useEffect } from 'react';

interface CategoryData {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface CategoryBreakdownProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface CategoriesResponse {
  categories: Array<{
    label: string;
    problems: number;
    percentage: number;
    color: string;
  }>;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  className = '',
}) => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/analytics/categories?days=30');

        if (!res.ok) {
          throw new Error(`Failed to fetch categories: ${res.status}`);
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Received non-JSON response from API");
        }

        const json = (await res.json()) as ApiSuccess<CategoriesResponse>;
        if (!json?.success) throw new Error('API reported failure');

        const mapped = (json.data?.categories || []).map((cat) => ({
          name: cat.label,
          count: cat.problems,
          percentage: cat.percentage,
          color: cat.color,
        }));

        if (isMounted) {
          setCategories(mapped);
        }
      } catch (error) {
        console.error('Failed to load category breakdown:', error);
        if (isMounted) {
          setCategories([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  }

  const total = categories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Category Breakdown</h3>

      <div className="mb-6">
        <div className="flex h-8 rounded-lg overflow-hidden">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              style={{
                width: `${cat.percentage}%`,
                backgroundColor: cat.color,
              }}
              title={`${cat.name}: ${cat.count} (${cat.percentage}%)`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((cat, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }} />
              <span className="text-sm font-medium text-gray-700">{cat.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{cat.count}</span>
              <span className="text-sm font-bold text-gray-900">{cat.percentage}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-gray-700">Total</span>
          <span className="text-sm font-bold text-gray-900">{total}</span>
        </div>
      </div>
    </div>
  );
};

export default CategoryBreakdown;
