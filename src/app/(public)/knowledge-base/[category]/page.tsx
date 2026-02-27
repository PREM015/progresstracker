"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function KnowledgeBaseCategoryPage() {
    const params = useParams();
    const category = params.category as string;

    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/knowledge-base/category/${category}`)
            .then(r => r.json())
            .then(data => setArticles(data.articles || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [category]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 capitalize">{category.replace(/-/g, ' ')}</h1>

                {articles.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
                        <span className="text-5xl">📚</span>
                        <p className="mt-4 text-gray-500">No articles in this category yet</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {articles.map(article => (
                            <a
                                key={article.slug}
                                href={`/knowledge-base/${category}/${article.slug}`}
                                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
                            >
                                <h2 className="text-xl font-bold mb-3 text-gray-900">{article.title}</h2>
                                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{article.excerpt}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{article.readTime} min read</span>
                                    <span>{article.views} views</span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
