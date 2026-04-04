"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { sanitizeHtml } from "@/lib/sanitize";

export default function KnowledgeBaseArticlePage() {
    const params = useParams();
    const category = params.category as string;
    const slug = params.slug as string;

    const [article, setArticle] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/knowledge-base/${category}/${slug}`)
            .then(r => r.json())
            .then(data => setArticle(data.article))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [category, slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <span className="text-5xl">📚</span>
                    <p className="mt-4 text-gray-500">Article not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <article className="max-w-4xl mx-auto px-4 py-16">
                <nav className="mb-8 text-sm">
                    <a href="/knowledge-base" className="text-indigo-600 hover:underline">Knowledge Base</a>
                    <span className="mx-2 text-gray-400">/</span>
                    <a href={`/knowledge-base/${category}`} className="text-indigo-600 hover:underline capitalize">
                        {category.replace(/-/g, ' ')}
                    </a>
                </nav>

                <h1 className="text-5xl font-bold mb-4">{article.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-8">
                    <span>{article.readTime} min read</span>
                    <span>•</span>
                    <span>{article.views} views</span>
                    <span>•</span>
                    <span>Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
                </div>

                <div className="prose prose-lg max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} />
                </div>

                <footer className="mt-12 pt-8 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Was this article helpful?
                        </div>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                                👍 Yes
                            </button>
                            <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                                👎 No
                            </button>
                        </div>
                    </div>
                </footer>
            </article>
        </div>
    );
}
