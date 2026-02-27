"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/blog/${slug}`)
      .then(r => r.json())
      .then(data => setPost(data.post))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">📝</span>
          <p className="mt-4 text-gray-500">Post not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <article className="max-w-4xl mx-auto px-4 py-16">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded">
              {post.category}
            </span>
            <span className="text-gray-500">
              {new Date(post.publishedAt).toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-5xl font-bold mb-4">{post.title}</h1>
          <p className="text-xl text-gray-600 mb-6">{post.excerpt}</p>
          <div className="flex items-center gap-4">
            {post.author?.avatar && (
              <img src={post.author.avatar} alt={post.author.name} className="w-12 h-12 rounded-full" />
            )}
            <div>
              <div className="font-medium">{post.author?.name}</div>
              <div className="text-sm text-gray-500">{post.readTime} min read</div>
            </div>
          </div>
        </header>

        {post.coverImage && (
          <img src={post.coverImage} alt={post.title} className="w-full rounded-xl mb-8" />
        )}

        <div className="prose prose-lg max-w-none">
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-gray-600">Share:</span>
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Twitter</button>
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">LinkedIn</button>
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Copy Link</button>
          </div>
        </footer>
      </article>
    </div>
  );
}
