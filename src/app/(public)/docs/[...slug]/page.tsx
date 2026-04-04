"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { sanitizeHtml } from "@/lib/sanitize";

export default function DocsSlugPage() {
  const params = useParams();
  const slug = params.slug as string[];

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = Array.isArray(slug) ? slug.join('/') : slug;
    fetch(`/api/docs/${path}`)
      .then(r => r.json())
      .then(data => setDoc(data.doc))
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

  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">📚</span>
          <p className="mt-4 text-gray-500">Documentation page not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 p-6 overflow-y-auto">
        <h2 className="font-bold text-lg mb-4">Documentation</h2>
        <nav className="space-y-2">
          {doc.sections?.map((section: any, idx: number) => (
            <a key={idx} href={`#${section.id}`} className="block px-3 py-2 rounded hover:bg-gray-100 text-sm">
              {section.title}
            </a>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-12">
        <article className="max-w-4xl">
          <h1 className="text-5xl font-bold mb-8">{doc.title}</h1>
          <div className="prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }} />
          </div>
        </article>
      </main>
    </div>
  );
}
