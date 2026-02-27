"use client";

import { useState, useEffect } from "react";
import { ChangelogList } from "@/components/changelog";

export default function ChangelogPage() {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/changelog')
      .then(r => r.json())
      .then(data => setVersions(data.versions || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-4">Changelog</h1>
        <p className="text-xl text-gray-600 mb-12">Track all updates and improvements to ProgressTracker</p>

        <ChangelogList versions={versions} isLoading={loading} />
      </div>
    </div>
  );
}
