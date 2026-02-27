"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults({});
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => setResults(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const totalResults = (results.goals?.length || 0) +
    (results.achievements?.length || 0) +
    (results.platforms?.length || 0) +
    (results.trackerEntries?.length || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-6">Search</h1>

          <div className="relative">
            <input
              type="text"
              placeholder="Search goals, achievements, platforms..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-6 py-4 text-lg border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              autoFocus
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
              </div>
            )}
          </div>

          {query.length > 0 && totalResults > 0 && (
            <p className="text-sm text-gray-500 mt-3">Found {totalResults} results</p>
          )}
        </div>

        {query.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-6xl">🔍</span>
            <p className="mt-4 text-gray-500">Start typing to search</p>
          </div>
        ) : totalResults === 0 && !loading ? (
          <div className="text-center py-16">
            <span className="text-6xl">😕</span>
            <p className="mt-4 text-gray-500">No results found</p>
            <p className="text-sm text-gray-400 mt-2">Try different keywords</p>
          </div>
        ) : (
          <div className="space-y-6">
            {results.goals && results.goals.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3">Goals</h2>
                <div className="space-y-2">
                  {results.goals.map((goal: any) => (
                    <a
                      key={goal.id}
                      href={`/goals/${goal.id}`}
                      className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition"
                    >
                      <h3 className="font-medium text-gray-900">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                      )}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {results.achievements && results.achievements.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3">Achievements</h2>
                <div className="space-y-2">
                  {results.achievements.map((achievement: any) => (
                    <a
                      key={achievement.id}
                      href={`/achievements/${achievement.id}`}
                      className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{achievement.icon}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                          <p className="text-sm text-gray-600">{achievement.description}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {results.platforms && results.platforms.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3">Platforms</h2>
                <div className="space-y-2">
                  {results.platforms.map((platform: any) => (
                    <a
                      key={platform.id}
                      href={`/platforms/${platform.id}`}
                      className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition"
                    >
                      <h3 className="font-medium text-gray-900">{platform.name}</h3>
                      {platform.description && (
                        <p className="text-sm text-gray-600 mt-1">{platform.description}</p>
                      )}
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
